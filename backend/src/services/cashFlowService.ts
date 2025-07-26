import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

interface CreateCashFlowRequest {
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: string;
  description?: string;
  listId?: string;
}

class CashFlowService {
  async addCashFlow(userId: string, data: CreateCashFlowRequest) {
    try {
      const cashFlow = await prisma.cashFlow.create({
        data: {
          userId,
          type: data.type,
          amount: data.amount,
          date: new Date(data.date),
          description: data.description,
          listId: data.listId,
        },
      });

      return cashFlow;
    } catch (error) {
      logger.error('Error adding cash flow:', error);
      throw error;
    }
  }

  async getCashFlows(userId: string, listId?: string) {
    try {
      return await prisma.cashFlow.findMany({
        where: {
          userId,
          listId: listId || undefined,
        },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching cash flows:', error);
      throw error;
    }
  }

  async getTotalCashInvested(userId: string, listId?: string): Promise<number> {
    try {
      const cashFlows = await this.getCashFlows(userId, listId);
      
      let totalInvested = 0;
      for (const flow of cashFlows) {
        if (flow.type === 'deposit') {
          totalInvested += flow.amount;
        } else if (flow.type === 'withdrawal') {
          totalInvested -= flow.amount;
        }
      }

      return totalInvested;
    } catch (error) {
      logger.error('Error calculating total cash invested:', error);
      throw error;
    }
  }

  async updateCashFlow(userId: string, cashFlowId: string, data: Partial<CreateCashFlowRequest>) {
    try {
      // Verify ownership
      const existingFlow = await prisma.cashFlow.findFirst({
        where: { id: cashFlowId, userId },
      });

      if (!existingFlow) {
        throw new Error('Cash flow not found');
      }

      return await prisma.cashFlow.update({
        where: { id: cashFlowId },
        data: {
          type: data.type,
          amount: data.amount,
          date: data.date ? new Date(data.date) : undefined,
          description: data.description,
        },
      });
    } catch (error) {
      logger.error('Error updating cash flow:', error);
      throw error;
    }
  }

  async deleteCashFlow(userId: string, cashFlowId: string) {
    try {
      // Verify ownership
      const existingFlow = await prisma.cashFlow.findFirst({
        where: { id: cashFlowId, userId },
      });

      if (!existingFlow) {
        throw new Error('Cash flow not found');
      }

      await prisma.cashFlow.delete({
        where: { id: cashFlowId },
      });
    } catch (error) {
      logger.error('Error deleting cash flow:', error);
      throw error;
    }
  }
}

export default CashFlowService; 