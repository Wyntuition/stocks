import { PrismaClient } from '@prisma/client';
import { 
  PortfolioItem, 
  CreatePortfolioItemRequest, 
  UpdatePortfolioItemRequest, 
  PortfolioSummary 
} from '../types';
import YahooFinanceService from './yahooFinanceService';
import CashFlowService from './cashFlowService';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

class PortfolioService {
  private prisma: PrismaClient;
  private yahooService: YahooFinanceService;
  private cashFlowService: CashFlowService;

  constructor() {
    this.prisma = prisma;
    this.yahooService = new YahooFinanceService();
    this.cashFlowService = new CashFlowService();
  }

  async createPortfolioItem(userId: string, data: CreatePortfolioItemRequest & { listId?: string }): Promise<PortfolioItem> {
    try {
      // Validate symbol by attempting to fetch stock data
      await this.yahooService.getStockData(data.symbol);

      const portfolioItem = await this.prisma.portfolio.create({
        data: {
          userId,
          listId: data.listId || null,
          symbol: data.symbol.toUpperCase(),
          quantity: data.quantity,
          purchasePrice: data.purchasePrice,
          purchaseDate: new Date(data.purchaseDate),
        },
      });

      return this.enrichPortfolioItem(portfolioItem);
    } catch (error) {
      logger.error('Error creating portfolio item:', error);
      throw error;
    }
  }

  async bulkCreatePortfolioItems(userId: string, items: (CreatePortfolioItemRequest & { listId?: string })[]): Promise<{
    successful: PortfolioItem[];
    failed: { item: CreatePortfolioItemRequest; error: string }[];
  }> {
    const results = { successful: [], failed: [] } as any;
    for (const item of items) {
      try {
        const created = await this.createPortfolioItem(userId, item);
        results.successful.push(created);
      } catch (error: any) {
        results.failed.push({ item, error: error.message });
      }
    }
    return results;
  }

  async getAllPortfolioItems(userId: string, listId?: string): Promise<PortfolioItem[]> {
    try {
      const whereClause: any = { userId };
      if (listId) {
        whereClause.listId = listId;
      }

      const items = await this.prisma.portfolio.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });

      return Promise.all(items.map((item: any) => this.enrichPortfolioItem(item)));
    } catch (error) {
      logger.error('Error fetching portfolio items:', error);
      throw error;
    }
  }

  async updatePortfolioItem(userId: string, id: string, data: UpdatePortfolioItemRequest): Promise<PortfolioItem> {
    try {
      const updateData: any = {};
      
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice;
      if (data.purchaseDate !== undefined) updateData.purchaseDate = new Date(data.purchaseDate);

      // Only update if the item belongs to the user
      const portfolioItem = await this.prisma.portfolio.update({
        where: { id_userId: { id, userId } },
        data: updateData,
      });

      return this.enrichPortfolioItem(portfolioItem);
    } catch (error) {
      logger.error('Error updating portfolio item:', error);
      throw error;
    }
  }

  async deletePortfolioItem(userId: string, id: string): Promise<void> {
    try {
      await this.prisma.portfolio.delete({
        where: { id_userId: { id, userId } },
      });
    } catch (error) {
      logger.error('Error deleting portfolio item:', error);
      throw error;
    }
  }

  async getPortfolioSummary(userId: string, listId?: string): Promise<PortfolioSummary> {
    try {
      const items = await this.getAllPortfolioItems(userId, listId);
      
      let totalValue = 0;
      let totalGainLoss = 0;
      let totalCost = 0;

      for (const item of items) {
        // Only include owned stocks (quantity > 0) in financial calculations
        if (item.quantity > 0) {
          if (item.totalValue) {
            totalValue += item.totalValue;
          }
          
          totalCost += item.purchasePrice * item.quantity;
          
          if (item.gainLoss) {
            totalGainLoss += item.gainLoss;
          }
        }
      }

      // We'll calculate this after getting total cash invested
      
      // Calculate time-based returns based on available stock data
      const timeBasedReturns = this.calculateTimeBasedReturns(items);

      // Get total cash invested
      const totalCashInvested = await this.cashFlowService.getTotalCashInvested(userId, listId);

      // Calculate gain/loss percentage based on total cash invested
      const totalGainLossPercent = totalCashInvested > 0 ? (totalGainLoss / totalCashInvested) * 100 : 0;

      // Calculate annualized return using total cash invested instead of just cost basis
      const annualizedReturn = this.calculateAnnualizedReturnWithCash(items, totalGainLoss, totalCashInvested);

      return {
        totalValue,
        totalGainLoss,
        totalGainLossPercent,
        annualizedReturn,
        totalCashInvested,
        itemCount: items.length, // Count all items (including watchlist)
        timeBasedReturns,
      };
    } catch (error) {
      logger.error('Error calculating portfolio summary:', error);
      throw error;
    }
  }

  private calculateAnnualizedReturn(items: any[], totalGainLoss: number, totalCost: number): number {
    if (totalCost <= 0 || items.length === 0) return 0;

    // Calculate weighted average holding period
    let weightedHoldingPeriod = 0;
    let totalWeight = 0;

    for (const item of items) {
      if (item.quantity > 0 && item.purchaseDate) {
        const purchaseDate = new Date(item.purchaseDate);
        const now = new Date();
        const holdingPeriodDays = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
        const holdingPeriodYears = holdingPeriodDays / 365.25;
        
        // Weight by position size
        const positionCost = item.purchasePrice * item.quantity;
        weightedHoldingPeriod += holdingPeriodYears * positionCost;
        totalWeight += positionCost;
      }
    }

    if (totalWeight <= 0) return 0;

    const averageHoldingPeriodYears = weightedHoldingPeriod / totalWeight;
    
    // Avoid division by zero or very small holding periods
    if (averageHoldingPeriodYears < 0.01) return 0; // Less than ~4 days
    
    const totalReturn = totalGainLoss / totalCost;
    
    // Calculate annualized return: (1 + total_return)^(1/years) - 1
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / averageHoldingPeriodYears) - 1;
    
    return annualizedReturn * 100; // Convert to percentage
  }

  private calculateAnnualizedReturnWithCash(items: any[], totalGainLoss: number, totalCashInvested: number): number {
    if (totalCashInvested <= 0 || items.length === 0) return 0;

    // Calculate weighted average holding period using cash flow dates
    // For now, use a simplified approach based on portfolio items
    let weightedHoldingPeriod = 0;
    let totalWeight = 0;

    for (const item of items) {
      if (item.quantity > 0 && item.purchaseDate) {
        const purchaseDate = new Date(item.purchaseDate);
        const now = new Date();
        const holdingPeriodDays = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
        const holdingPeriodYears = holdingPeriodDays / 365.25;
        
        // Weight by position cost (using current total cash invested proportionally)
        const positionCost = item.purchasePrice * item.quantity;
        weightedHoldingPeriod += holdingPeriodYears * positionCost;
        totalWeight += positionCost;
      }
    }

    if (totalWeight <= 0) return 0;

    const averageHoldingPeriodYears = weightedHoldingPeriod / totalWeight;
    
    // Avoid division by zero or very small holding periods
    if (averageHoldingPeriodYears < 0.01) return 0; // Less than ~4 days
    
    // Calculate total return against total cash invested
    const totalReturn = totalGainLoss / totalCashInvested;
    
    // Calculate annualized return: (1 + total_return)^(1/years) - 1
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / averageHoldingPeriodYears) - 1;
    
    return annualizedReturn * 100; // Convert to percentage
  }

  private calculateTimeBasedReturns(items: any[]) {
    let totalValue = 0;
    let weighted6Month = 0;
    let weighted1Year = 0;
    let weighted3Year = 0;

    // Calculate weighted average returns based on position sizes
    for (const item of items) {
      if (item.quantity > 0 && item.totalValue && item.stockData) {
        totalValue += item.totalValue;
        
        if (item.stockData.change6MonthPercent) {
          weighted6Month += item.stockData.change6MonthPercent * item.totalValue;
        }
        
        if (item.stockData.change1YearPercent) {
          weighted1Year += item.stockData.change1YearPercent * item.totalValue;
        }
        
        if (item.stockData.change3YearPercent) {
          weighted3Year += item.stockData.change3YearPercent * item.totalValue;
        }
      }
    }

    // Return weighted averages (or null if no data)
    return {
      sixMonth: totalValue > 0 ? weighted6Month / totalValue : undefined,
      oneYear: totalValue > 0 ? weighted1Year / totalValue : undefined,
      threeYear: totalValue > 0 ? weighted3Year / totalValue : undefined,
      fiveYear: undefined, // Not available in current data
      tenYear: undefined, // Not available in current data
    };
  }

  private async enrichPortfolioItem(item: any): Promise<PortfolioItem> {
    try {
      const stockData = await this.yahooService.getStockData(item.symbol);
      
      const currentPrice = stockData.currentPrice || 0;
      
      // For watchlist-only stocks (quantity = 0), don't calculate value/gains
      let totalValue: number | undefined;
      let gainLoss: number | undefined;
      let gainLossPercent: number | undefined;
      
      if (item.quantity > 0) {
        totalValue = currentPrice * item.quantity;
        const totalCost = item.purchasePrice * item.quantity;
        gainLoss = totalValue - totalCost;
        gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
      }

      return {
        id: item.id,
        symbol: item.symbol,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        purchaseDate: item.purchaseDate,
        currentPrice,
        totalValue,
        gainLoss,
        gainLossPercent,
        stockData,
      };
    } catch (error) {
      logger.error(`Error enriching portfolio item ${item.symbol}:`, error);
      
      // Return basic item data if enrichment fails
      return {
        id: item.id,
        symbol: item.symbol,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        purchaseDate: item.purchaseDate,
      };
    }
  }
}

export default PortfolioService;
