import express from 'express';
import { z } from 'zod';
import PortfolioService from '../services/portfolioService';
import AIRecommendationService from '../services/aiRecommendationService';
import TransactionService from '../services/transactionService';
import CashFlowService from '../services/cashFlowService';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { parseStockCsv } from '../utils/stockCsvParser';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const router = express.Router();
const portfolioService = new PortfolioService();
const aiRecommendationService = new AIRecommendationService();
const transactionService = new TransactionService();
const cashFlowService = new CashFlowService();

// Validation schemas
const createPortfolioItemSchema = z.object({
  symbol: z.string().min(1).max(10),
  quantity: z.number().min(0), // Allow 0 for watchlist-only stocks
  purchasePrice: z.number().min(0), // Allow 0 when quantity is 0
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  listId: z.string().optional(), // Optional list ID
}).refine((data) => {
  // When quantity > 0, purchasePrice must be > 0
  if (data.quantity > 0) {
    return data.purchasePrice > 0;
  }
  // When quantity is 0, purchasePrice can be 0 (watchlist mode)
  return true;
}, {
  message: "Purchase price must be greater than 0 when quantity is greater than 0",
  path: ["purchasePrice"],
});

const updatePortfolioItemSchema = z.object({
  quantity: z.number().min(0).optional(), // Allow 0 for watchlist-only stocks
  purchasePrice: z.number().min(0).optional(), // Allow 0 when quantity is 0
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const bulkImportSchema = z.object({
  items: z.array(createPortfolioItemSchema).min(1).max(100), // Limit to 100 items per import
  listId: z.string().optional(), // Optional default list for all items
});

const cashFlowSchema = z.object({
  type: z.enum(['deposit', 'withdrawal']),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
  listId: z.string().optional(),
});

const sellPositionSchema = z.object({
  portfolioId: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fees: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// GET /api/portfolio - Get all portfolio items
router.get('/', requireAuth, async (req, res) => {
  try {
    const listId = req.query.listId as string | undefined;
    const items = await portfolioService.getAllPortfolioItems(req.userId!, listId);
    res.json(items);
  } catch (error) {
    logger.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio items' });
  }
});

// GET /api/portfolio/summary - Get portfolio summary
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const listId = req.query.listId as string | undefined;
    const summary = await portfolioService.getPortfolioSummary(req.userId!, listId);
    res.json(summary);
  } catch (error) {
    logger.error('Error fetching portfolio summary:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio summary' });
  }
});

// POST /api/portfolio/stock - Add new stock to portfolio
router.post('/stock', requireAuth, async (req, res) => {
  try {
    const validatedData = createPortfolioItemSchema.parse(req.body);
    const item = await portfolioService.createPortfolioItem(req.userId!, validatedData);
    res.status(201).json(item);
  } catch (error) {
    logger.error('Error creating portfolio item:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create portfolio item' });
  }
});

// PUT /api/portfolio/stock/:id - Update stock in portfolio
router.put('/stock/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updatePortfolioItemSchema.parse(req.body);
    const item = await portfolioService.updatePortfolioItem(req.userId!, id, validatedData);
    res.json(item);
  } catch (error) {
    logger.error('Error updating portfolio item:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update portfolio item' });
  }
});

// DELETE /api/portfolio/stock/:id - Delete stock from portfolio
router.delete('/stock/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await portfolioService.deletePortfolioItem(req.userId!, id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting portfolio item:', error);
    res.status(500).json({ error: 'Failed to delete portfolio item' });
  }
});

// POST /api/portfolio/bulk - Bulk import portfolio items
router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const validatedData = bulkImportSchema.parse(req.body);
    
    // Add default listId to items that don't have one
    const itemsWithList = validatedData.items.map(item => ({
      ...item,
      listId: item.listId || validatedData.listId
    }));
    
    const results = await portfolioService.bulkCreatePortfolioItems(req.userId!, itemsWithList);
    res.status(201).json(results);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    logger.error('Error bulk importing portfolio items:', error);
    res.status(500).json({ error: 'Failed to import portfolio items' });
  }
});

// POST /api/portfolio/import-csv - Import portfolio items from raw CSV
router.post('/import-csv', requireAuth, async (req, res) => {
  try {
    const { csv, listId } = req.body;
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid CSV data' });
    }
    // Parse CSV using backend parser
    const parsedRows = parseStockCsv(csv);
    // Map to portfolio item format (adapt as needed)
    const items = parsedRows.map(row => ({
      symbol: row.symbol,
      quantity: row.quantity ?? 0,
      purchasePrice: row.quantity ? (row.costBasisTotal ?? 0) / row.quantity : 0,
      purchaseDate: new Date().toISOString().split('T')[0], // Placeholder, adapt as needed
      listId: listId || undefined,
      // Optionally, add originalRow: row.originalRow if schema supports
    }));
    // Import using existing bulk logic
    const results = await portfolioService.bulkCreatePortfolioItems(req.userId!, items);
    res.status(201).json({
      importCount: items.length,
      successful: results.successful,
      failed: results.failed,
      errors: results.failed.map((f: any) => f.error),
      originalRows: parsedRows.map(r => r.originalRow)
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    logger.error('Error importing CSV portfolio items:', error);
    res.status(500).json({ error: 'Failed to import portfolio items from CSV' });
  }
});

// Get past AI analysis results
router.get('/past-analyses', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const listId = req.query.listId as string | undefined;
    const analyses = await aiRecommendationService.getPastAnalyses(userId, listId);
    
    res.json({ analyses });
  } catch (error) {
    logger.error('Error fetching past analyses:', error);
    res.status(500).json({ error: 'Failed to fetch past analyses' });
  }
});

// AI Analysis endpoint
router.get('/ai-analysis', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const listId = req.query.listId as string | undefined;
    const portfolioItems = await portfolioService.getAllPortfolioItems(userId, listId);
    
    if (portfolioItems.length === 0) {
      return res.status(400).json({ error: 'No portfolio items found for analysis' });
    }

    const analysis = await aiRecommendationService.analyzeAndStorePortfolio(userId, listId, portfolioItems);
    res.json(analysis);
  } catch (error) {
    logger.error('Error performing AI analysis:', error);
    res.status(500).json({ error: 'Failed to perform AI analysis' });
  }
});

// Cash Flow Management
router.post('/cash-flow', requireAuth, async (req, res) => {
  try {
    const validatedData = cashFlowSchema.parse(req.body);
    const cashFlow = await cashFlowService.addCashFlow(req.userId!, validatedData);
    res.status(201).json(cashFlow);
  } catch (error) {
    logger.error('Error adding cash flow:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to add cash flow' });
  }
});

router.get('/cash-flows', requireAuth, async (req, res) => {
  try {
    const listId = req.query.listId as string | undefined;
    const cashFlows = await cashFlowService.getCashFlows(req.userId!, listId);
    res.json(cashFlows);
  } catch (error) {
    logger.error('Error fetching cash flows:', error);
    res.status(500).json({ error: 'Failed to fetch cash flows' });
  }
});

router.get('/total-cash-invested', requireAuth, async (req, res) => {
  try {
    const listId = req.query.listId as string | undefined;
    const totalInvested = await cashFlowService.getTotalCashInvested(req.userId!, listId);
    res.json({ totalCashInvested: totalInvested });
  } catch (error) {
    logger.error('Error calculating total cash invested:', error);
    res.status(500).json({ error: 'Failed to calculate total cash invested' });
  }
});

// Position Selling
router.post('/sell-position', requireAuth, async (req, res) => {
  try {
    const validatedData = sellPositionSchema.parse(req.body);
    const transaction = await transactionService.sellPosition(req.userId!, validatedData);
    res.status(201).json(transaction);
  } catch (error) {
    logger.error('Error selling position:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to sell position' });
  }
});

// Transaction History
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const listId = req.query.listId as string | undefined;
    const transactions = await transactionService.getAllTransactions(req.userId!, listId);
    res.json(transactions);
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
