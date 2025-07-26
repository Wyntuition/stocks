import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import YahooFinanceService from './yahooFinanceService';

interface CreateTransactionRequest {
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
  fees?: number;
  notes?: string;
  listId?: string;
}

interface SellPositionRequest {
  portfolioId: string;
  quantity: number;
  price: number;
  date?: string;
  fees?: number;
  notes?: string;
}

interface PositionSummary {
  symbol: string;
  totalBought: number;
  totalSold: number;
  currentQuantity: number;
  averageBuyPrice: number;
  averageSellPrice?: number;
  totalReturn: number;
  totalReturnPercent: number;
  realizedGainLoss: number;
  unrealizedGainLoss: number;
  currentValue: number;
}

class TransactionService {
  private yahooService: YahooFinanceService;

  constructor() {
    this.yahooService = new YahooFinanceService();
  }

  async createTransaction(userId: string, data: CreateTransactionRequest) {
    try {
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          symbol: data.symbol.toUpperCase(),
          type: data.type,
          quantity: data.quantity,
          price: data.price,
          date: new Date(data.date),
          fees: data.fees || 0,
          notes: data.notes,
          listId: data.listId,
        },
      });

      // If it's a buy transaction, update or create portfolio position
      if (data.type === 'buy') {
        await this.updatePortfolioPosition(userId, data);
      }

      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  async sellPosition(userId: string, data: SellPositionRequest) {
    try {
      // Get the portfolio item
      const portfolioItem = await prisma.portfolio.findFirst({
        where: {
          id: data.portfolioId,
          userId,
        },
      });

      if (!portfolioItem) {
        throw new Error('Portfolio position not found');
      }

      if (portfolioItem.quantity < data.quantity) {
        throw new Error('Cannot sell more shares than owned');
      }

      // Create sell transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          portfolioId: data.portfolioId,
          symbol: portfolioItem.symbol,
          type: 'sell',
          quantity: data.quantity,
          price: data.price,
          date: data.date ? new Date(data.date) : new Date(),
          fees: data.fees || 0,
          notes: data.notes,
          listId: portfolioItem.listId,
        },
      });

      // Update portfolio position
      const newQuantity = portfolioItem.quantity - data.quantity;
      
      if (newQuantity === 0) {
        // If selling all shares, delete the portfolio position but keep transaction history
        await prisma.portfolio.delete({
          where: { id: data.portfolioId },
        });
      } else {
        // Update the remaining quantity
        await prisma.portfolio.update({
          where: { id: data.portfolioId },
          data: { quantity: newQuantity },
        });
      }

      return transaction;
    } catch (error) {
      logger.error('Error selling position:', error);
      throw error;
    }
  }

  async getPositionSummary(userId: string, symbol: string, listId?: string): Promise<PositionSummary> {
    try {
      // Get all transactions for this symbol
      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          symbol: symbol.toUpperCase(),
          listId: listId || undefined,
        },
        orderBy: { date: 'asc' },
      });

      // Calculate position summary
      let totalBought = 0;
      let totalSold = 0;
      let totalBoughtValue = 0;
      let totalSoldValue = 0;
      let totalFees = 0;

      for (const transaction of transactions) {
        totalFees += transaction.fees || 0;
        
        if (transaction.type === 'buy') {
          totalBought += transaction.quantity;
          totalBoughtValue += transaction.quantity * transaction.price;
        } else {
          totalSold += transaction.quantity;
          totalSoldValue += transaction.quantity * transaction.price;
        }
      }

      const currentQuantity = totalBought - totalSold;
      const averageBuyPrice = totalBought > 0 ? totalBoughtValue / totalBought : 0;
      const averageSellPrice = totalSold > 0 ? totalSoldValue / totalSold : undefined;

      // Get current stock price for unrealized gains
      let currentPrice = 0;
      try {
        const stockData = await this.yahooService.getStockData(symbol);
        currentPrice = stockData.currentPrice || 0;
      } catch (error) {
        logger.warn(`Could not get current price for ${symbol}`);
      }

      const currentValue = currentQuantity * currentPrice;
      const realizedGainLoss = totalSoldValue - (totalSold * averageBuyPrice) - totalFees;
      const unrealizedGainLoss = currentQuantity > 0 ? currentValue - (currentQuantity * averageBuyPrice) : 0;
      const totalReturn = realizedGainLoss + unrealizedGainLoss;
      const totalReturnPercent = totalBoughtValue > 0 ? (totalReturn / totalBoughtValue) * 100 : 0;

      return {
        symbol,
        totalBought,
        totalSold,
        currentQuantity,
        averageBuyPrice,
        averageSellPrice,
        totalReturn,
        totalReturnPercent,
        realizedGainLoss,
        unrealizedGainLoss,
        currentValue,
      };
    } catch (error) {
      logger.error('Error getting position summary:', error);
      throw error;
    }
  }

  async getAllTransactions(userId: string, listId?: string) {
    try {
      return await prisma.transaction.findMany({
        where: {
          userId,
          listId: listId || undefined,
        },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async getTransactionsBySymbol(userId: string, symbol: string, listId?: string) {
    try {
      return await prisma.transaction.findMany({
        where: {
          userId,
          symbol: symbol.toUpperCase(),
          listId: listId || undefined,
        },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching transactions by symbol:', error);
      throw error;
    }
  }

  private async updatePortfolioPosition(userId: string, data: CreateTransactionRequest) {
    try {
      // Check if portfolio position already exists
      const existingPosition = await prisma.portfolio.findFirst({
        where: {
          userId,
          symbol: data.symbol.toUpperCase(),
          listId: data.listId || null,
        },
      });

      if (existingPosition) {
        // Update existing position with weighted average price
        const currentValue = existingPosition.quantity * existingPosition.purchasePrice;
        const newValue = data.quantity * data.price;
        const totalQuantity = existingPosition.quantity + data.quantity;
        const averagePrice = (currentValue + newValue) / totalQuantity;

        await prisma.portfolio.update({
          where: { id: existingPosition.id },
          data: {
            quantity: totalQuantity,
            purchasePrice: averagePrice,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new portfolio position
        await prisma.portfolio.create({
          data: {
            userId,
            symbol: data.symbol.toUpperCase(),
            quantity: data.quantity,
            purchasePrice: data.price,
            purchaseDate: new Date(data.date),
            listId: data.listId,
          },
        });
      }
    } catch (error) {
      logger.error('Error updating portfolio position:', error);
      throw error;
    }
  }
}

export default TransactionService; 