const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// We'll test the service directly
const PortfolioService = require('../src/services/portfolioService').default;

const prisma = new PrismaClient();

describe('Portfolio Service List Isolation', () => {
  let portfolioService;
  let testUser;
  let list1, list2;

  beforeAll(async () => {
    portfolioService = new PortfolioService();
    
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
    await prisma.portfolio.deleteMany({});
    await prisma.list.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up portfolio items before each test
    await prisma.portfolio.deleteMany({});
  });

  test('should create stocks in different lists independently', async () => {
    // Add AAPL to list1
    const stock1 = await portfolioService.createPortfolioItem(testUser.id, {
      symbol: 'AAPL',
      quantity: 10,
      purchasePrice: 150.00,
      purchaseDate: '2023-01-01',
      listId: list1.id
    });

    // Add AAPL to list2 with different quantity
    const stock2 = await portfolioService.createPortfolioItem(testUser.id, {
      symbol: 'AAPL',
      quantity: 5,
      purchasePrice: 160.00,
      purchaseDate: '2023-02-01',
      listId: list2.id
    });

    // Verify different IDs
    expect(stock1.id).not.toBe(stock2.id);

    // Verify list1 has correct stock
    const list1Items = await portfolioService.getAllPortfolioItems(testUser.id, list1.id);
    expect(list1Items).toHaveLength(1);
    expect(list1Items[0].symbol).toBe('AAPL');
    expect(list1Items[0].quantity).toBe(10);

    // Verify list2 has correct stock
    const list2Items = await portfolioService.getAllPortfolioItems(testUser.id, list2.id);
    expect(list2Items).toHaveLength(1);
    expect(list2Items[0].symbol).toBe('AAPL');
    expect(list2Items[0].quantity).toBe(5);
  });

  test('should delete stock from correct list only', async () => {
    // Add AAPL to both lists
    const stock1 = await portfolioService.createPortfolioItem(testUser.id, {
      symbol: 'AAPL',
      quantity: 10,
      purchasePrice: 150.00,
      purchaseDate: '2023-01-01',
      listId: list1.id
    });

    const stock2 = await portfolioService.createPortfolioItem(testUser.id, {
      symbol: 'AAPL',
      quantity: 5,
      purchasePrice: 160.00,
      purchaseDate: '2023-02-01',
      listId: list2.id
    });

    // Add another stock to list1 to verify it's not affected
    const stock3 = await portfolioService.createPortfolioItem(testUser.id, {
      symbol: 'GOOGL',
      quantity: 3,
      purchasePrice: 100.00,
      purchaseDate: '2023-03-01',
      listId: list1.id
    });

    // Delete AAPL from list1 (using stock1's ID)
    await portfolioService.deletePortfolioItem(testUser.id, stock1.id);

    // Verify list1 now only has GOOGL
    const list1Items = await portfolioService.getAllPortfolioItems(testUser.id, list1.id);
    expect(list1Items).toHaveLength(1);
    expect(list1Items[0].symbol).toBe('GOOGL');

    // Verify list2 still has AAPL
    const list2Items = await portfolioService.getAllPortfolioItems(testUser.id, list2.id);
    expect(list2Items).toHaveLength(1);
    expect(list2Items[0].symbol).toBe('AAPL');
    expect(list2Items[0].quantity).toBe(5);
    expect(list2Items[0].id).toBe(stock2.id);
  });

  test('should prevent deleting stock from wrong user', async () => {
    // Create another user
    const otherUser = await prisma.user.create({
      data: {
        email: 'other@example.com',
        name: 'Other User',
        passwordHash: await bcrypt.hash('password123', 10)
      }
    });

    // Create stock for testUser
    const stock = await portfolioService.createPortfolioItem(testUser.id, {
      symbol: 'AAPL',
      quantity: 10,
      purchasePrice: 150.00,
      purchaseDate: '2023-01-01',
      listId: list1.id
    });

    // Try to delete with wrong user ID - should fail
    await expect(
      portfolioService.deletePortfolioItem(otherUser.id, stock.id)
    ).rejects.toThrow();

    // Verify stock still exists
    const items = await portfolioService.getAllPortfolioItems(testUser.id, list1.id);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(stock.id);

    // Cleanup
    await prisma.user.delete({ where: { id: otherUser.id } });
  });

  test('direct database check - verify list isolation at data level', async () => {
    // Add stocks directly via Prisma to verify data integrity
    const stock1 = await prisma.portfolio.create({
      data: {
        userId: testUser.id,
        listId: list1.id,
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: 150.00,
        purchaseDate: new Date('2023-01-01')
      }
    });

    const stock2 = await prisma.portfolio.create({
      data: {
        userId: testUser.id,
        listId: list2.id,
        symbol: 'AAPL',
        quantity: 5,
        purchasePrice: 160.00,
        purchaseDate: new Date('2023-02-01')
      }
    });

    // Verify they have different IDs and listIds
    expect(stock1.id).not.toBe(stock2.id);
    expect(stock1.listId).toBe(list1.id);
    expect(stock2.listId).toBe(list2.id);

    // Delete stock1
    await prisma.portfolio.delete({
      where: { id: stock1.id }
    });

    // Verify stock1 is gone
    const deletedStock = await prisma.portfolio.findUnique({
      where: { id: stock1.id }
    });
    expect(deletedStock).toBeNull();

    // Verify stock2 still exists
    const existingStock = await prisma.portfolio.findUnique({
      where: { id: stock2.id }
    });
    expect(existingStock).not.toBeNull();
    expect(existingStock.listId).toBe(list2.id);
  });
}); 