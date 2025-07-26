import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
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

const createListSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
});

const updateListSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
});

// GET /api/lists - Get all lists for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const lists = await prisma.list.findMany({
      where: { userId: req.userId! },
      include: {
        portfolios: {
          select: {
            id: true,
            symbol: true,
            quantity: true,
          }
        },
        _count: {
          select: { portfolios: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    });
    res.json(lists);
  } catch (error) {
    logger.error('Error fetching lists:', error);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// POST /api/lists - Create new list
router.post('/', requireAuth, async (req, res) => {
  try {
    const validatedData = createListSchema.parse(req.body);
    
    // Check if name already exists for this user
    const existing = await prisma.list.findUnique({
      where: {
        userId_name: {
          userId: req.userId!,
          name: validatedData.name
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'List name already exists' });
    }

    const list = await prisma.list.create({
      data: {
        userId: req.userId!,
        name: validatedData.name,
        description: validatedData.description,
      },
      include: {
        _count: {
          select: { portfolios: true }
        }
      }
    });

    res.status(201).json(list);
  } catch (error) {
    logger.error('Error creating list:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// PUT /api/lists/:id - Update list
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateListSchema.parse(req.body);

    // Check if new name conflicts with existing list
    if (validatedData.name) {
      const existing = await prisma.list.findFirst({
        where: {
          userId: req.userId!,
          name: validatedData.name,
          id: { not: id }
        }
      });

      if (existing) {
        return res.status(409).json({ error: 'List name already exists' });
      }
    }

    const list = await prisma.list.update({
      where: {
        id,
        userId: req.userId!
      },
      data: validatedData,
      include: {
        _count: {
          select: { portfolios: true }
        }
      }
    });

    res.json(list);
  } catch (error) {
    logger.error('Error updating list:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update list' });
  }
});

// DELETE /api/lists/:id - Delete list
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if this is a default list
    const list = await prisma.list.findFirst({
      where: {
        id,
        userId: req.userId!
      }
    });

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (list.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default list' });
    }

    // Move all portfolios from this list to default list
    const defaultList = await prisma.list.findFirst({
      where: {
        userId: req.userId!,
        isDefault: true
      }
    });

    if (defaultList) {
      await prisma.portfolio.updateMany({
        where: { listId: id },
        data: { listId: defaultList.id }
      });
    } else {
      // If no default list, set portfolios to null (main portfolio)
      await prisma.portfolio.updateMany({
        where: { listId: id },
        data: { listId: null }
      });
    }

    await prisma.list.delete({
      where: {
        id,
        userId: req.userId!
      }
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting list:', error);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// POST /api/lists/:id/set-default - Set list as default
router.post('/:id/set-default', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction([
      // Remove default from all lists
      prisma.list.updateMany({
        where: { userId: req.userId! },
        data: { isDefault: false }
      }),
      // Set new default
      prisma.list.update({
        where: {
          id,
          userId: req.userId!
        },
        data: { isDefault: true }
      })
    ]);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error setting default list:', error);
    res.status(500).json({ error: 'Failed to set default list' });
  }
});

export default router; 