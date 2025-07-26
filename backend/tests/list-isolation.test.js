const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock app setup
const express = require('express');
const app = express();
app.use(express.json());

// Import routes
const authRoutes = require('../src/routes/auth').default;
const listRoutes = require('../src/routes/list').default;
const portfolioRoutes = require('../src/routes/portfolio').default;

app.use('/api/auth', authRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/portfolio', portfolioRoutes);

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

describe('List Isolation Tests', () => {
  let testUser;
  let authToken;
  let list1, list2;

  beforeAll(async () => {
    // Clean up test data
    await prisma.portfolio.deleteMany({});
    await prisma.list.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user
    const passwordHash = await bcrypt.hash('testpass123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
      }
    });

    // Generate auth token
    authToken = jwt.sign({ userId: testUser.id }, JWT_SECRET);

    // Create two test lists
    list1 = await prisma.list.create({
      data: {
        userId: testUser.id,
        name: 'Portfolio A',
        description: 'First portfolio',
        isDefault: true
      }
    });

    list2 = await prisma.list.create({
      data: {
        userId: testUser.id,
        name: 'Portfolio B', 
        description: 'Second portfolio'
      }
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.portfolio.deleteMany({});
    await prisma.list.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('Portfolio Item List Isolation', () => {
    let stockInList1, stockInList2, sameStockInBothLists;

    beforeEach(async () => {
      // Clean up any existing portfolio items
      await prisma.portfolio.deleteMany({});

      // Add same stock (AAPL) to both lists
      stockInList1 = await prisma.portfolio.create({
        data: {
          userId: testUser.id,
          listId: list1.id,
          symbol: 'AAPL',
          quantity: 10,
          purchasePrice: 150.00,
          purchaseDate: new Date('2023-01-01')
        }
      });

      stockInList2 = await prisma.portfolio.create({
        data: {
          userId: testUser.id,
          listId: list2.id,
          symbol: 'AAPL', 
          quantity: 5,
          purchasePrice: 160.00,
          purchaseDate: new Date('2023-02-01')
        }
      });

      // Add different stock (GOOGL) to list1 only
      sameStockInBothLists = await prisma.portfolio.create({
        data: {
          userId: testUser.id,
          listId: list1.id,
          symbol: 'GOOGL',
          quantity: 3,
          purchasePrice: 100.00,
          purchaseDate: new Date('2023-03-01')
        }
      });
    });

    test('should fetch stocks only from specified list', async () => {
      // Get stocks from list1
      const response1 = await request(app)
        .get(`/api/portfolio?listId=${list1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.status).toBe(200);
      expect(response1.body).toHaveLength(2); // AAPL and GOOGL
      
      const symbols1 = response1.body.map(item => item.symbol).sort();
      expect(symbols1).toEqual(['AAPL', 'GOOGL']);

      // Get stocks from list2
      const response2 = await request(app)
        .get(`/api/portfolio?listId=${list2.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response2.status).toBe(200);
      expect(response2.body).toHaveLength(1); // Only AAPL
      expect(response2.body[0].symbol).toBe('AAPL');
      expect(response2.body[0].quantity).toBe(5); // Different quantity than list1
    });

    test('should delete stock only from specified list', async () => {
      // Delete AAPL from list1
      const deleteResponse = await request(app)
        .delete(`/api/portfolio/${stockInList1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(204);

      // Verify AAPL is gone from list1
      const list1Response = await request(app)
        .get(`/api/portfolio?listId=${list1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(list1Response.status).toBe(200);
      expect(list1Response.body).toHaveLength(1); // Only GOOGL should remain
      expect(list1Response.body[0].symbol).toBe('GOOGL');

      // Verify AAPL still exists in list2
      const list2Response = await request(app)
        .get(`/api/portfolio?listId=${list2.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(list2Response.status).toBe(200);
      expect(list2Response.body).toHaveLength(1); // AAPL should still be there
      expect(list2Response.body[0].symbol).toBe('AAPL');
      expect(list2Response.body[0].quantity).toBe(5);
    });

    test('should add stock to specific list only', async () => {
      // Add MSFT to list2
      const addResponse = await request(app)
        .post('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol: 'MSFT',
          quantity: 7,
          purchasePrice: 250.00,
          purchaseDate: '2023-04-01',
          listId: list2.id
        });

      expect(addResponse.status).toBe(201);

      // Verify MSFT is in list2
      const list2Response = await request(app)
        .get(`/api/portfolio?listId=${list2.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(list2Response.status).toBe(200);
      const symbols2 = list2Response.body.map(item => item.symbol).sort();
      expect(symbols2).toContain('MSFT');

      // Verify MSFT is NOT in list1
      const list1Response = await request(app)
        .get(`/api/portfolio?listId=${list1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(list1Response.status).toBe(200);
      const symbols1 = list1Response.body.map(item => item.symbol);
      expect(symbols1).not.toContain('MSFT');
    });

    test('should update stock in specific list only', async () => {
      // Update AAPL quantity in list1
      const updateResponse = await request(app)
        .put(`/api/portfolio/${stockInList1.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 15,
          purchasePrice: 155.00
        });

      expect(updateResponse.status).toBe(200);

      // Verify update in list1
      const list1Response = await request(app)
        .get(`/api/portfolio?listId=${list1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const aaplInList1 = list1Response.body.find(item => item.symbol === 'AAPL');
      expect(aaplInList1.quantity).toBe(15);
      expect(aaplInList1.purchasePrice).toBe(155.00);

      // Verify AAPL in list2 is unchanged
      const list2Response = await request(app)
        .get(`/api/portfolio?listId=${list2.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const aaplInList2 = list2Response.body.find(item => item.symbol === 'AAPL');
      expect(aaplInList2.quantity).toBe(5); // Original quantity
      expect(aaplInList2.purchasePrice).toBe(160.00); // Original price
    });

    test('should maintain list isolation across multiple operations', async () => {
      // Perform multiple operations and verify isolation
      
      // 1. Add different quantities of same stock to both lists
      await request(app)
        .post('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol: 'TSLA',
          quantity: 2,
          purchasePrice: 800.00,
          purchaseDate: '2023-05-01',
          listId: list1.id
        });

      await request(app)
        .post('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol: 'TSLA',
          quantity: 8,
          purchasePrice: 750.00,
          purchaseDate: '2023-05-15',
          listId: list2.id
        });

      // 2. Verify both lists have correct TSLA quantities
      const list1Check = await request(app)
        .get(`/api/portfolio?listId=${list1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const list2Check = await request(app)
        .get(`/api/portfolio?listId=${list2.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const tslaList1 = list1Check.body.find(item => item.symbol === 'TSLA');
      const tslaList2 = list2Check.body.find(item => item.symbol === 'TSLA');

      expect(tslaList1.quantity).toBe(2);
      expect(tslaList2.quantity).toBe(8);

      // 3. Delete TSLA from list1 only
      await request(app)
        .delete(`/api/portfolio/${tslaList1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // 4. Verify TSLA is gone from list1 but still in list2
      const finalList1 = await request(app)
        .get(`/api/portfolio?listId=${list1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const finalList2 = await request(app)
        .get(`/api/portfolio?listId=${list2.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const symbols1Final = finalList1.body.map(item => item.symbol);
      const symbols2Final = finalList2.body.map(item => item.symbol);

      expect(symbols1Final).not.toContain('TSLA');
      expect(symbols2Final).toContain('TSLA');
    });
  });
}); 