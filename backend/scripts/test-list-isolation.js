const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testListIsolation() {
  try {
    console.log('🧪 Testing List Isolation...\n');

    // Find or create a test user
    let testUser = await prisma.user.findFirst({
      where: { email: 'test@example.com' }
    });

    if (!testUser) {
      console.log('❌ No test user found. Please register a user first.');
      return;
    }

    console.log(`✅ Found test user: ${testUser.email}`);

    // Get user's lists
    const lists = await prisma.list.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📋 Found ${lists.length} lists:`);
    lists.forEach((list, i) => {
      console.log(`   ${i + 1}. ${list.name} (${list.id}) ${list.isDefault ? '[DEFAULT]' : ''}`);
    });

    if (lists.length < 2) {
      console.log('❌ Need at least 2 lists to test isolation. Create more lists first.');
      return;
    }

    const list1 = lists[0];
    const list2 = lists[1];

    // Clean up existing test data
    await prisma.portfolio.deleteMany({
      where: {
        userId: testUser.id,
        symbol: { in: ['TEST1', 'TEST2'] }
      }
    });

    console.log('\n🏗️  Setting up test data...');

    // Add TEST1 to both lists with different quantities
    const stock1 = await prisma.portfolio.create({
      data: {
        userId: testUser.id,
        listId: list1.id,
        symbol: 'TEST1',
        quantity: 100,
        purchasePrice: 50.00,
        purchaseDate: new Date('2023-01-01')
      }
    });

    const stock2 = await prisma.portfolio.create({
      data: {
        userId: testUser.id,
        listId: list2.id,
        symbol: 'TEST1',
        quantity: 200,
        purchasePrice: 60.00,
        purchaseDate: new Date('2023-02-01')
      }
    });

    // Add TEST2 to list1 only
    const stock3 = await prisma.portfolio.create({
      data: {
        userId: testUser.id,
        listId: list1.id,
        symbol: 'TEST2',
        quantity: 50,
        purchasePrice: 75.00,
        purchaseDate: new Date('2023-03-01')
      }
    });

    console.log(`✅ Created test stocks:`);
    console.log(`   - TEST1 in ${list1.name}: ${stock1.quantity} shares (ID: ${stock1.id})`);
    console.log(`   - TEST1 in ${list2.name}: ${stock2.quantity} shares (ID: ${stock2.id})`);
    console.log(`   - TEST2 in ${list1.name}: ${stock3.quantity} shares (ID: ${stock3.id})`);

    // Test: Get stocks from each list
    console.log('\n🔍 Checking list contents...');

    const list1Stocks = await prisma.portfolio.findMany({
      where: { userId: testUser.id, listId: list1.id },
      select: { id: true, symbol: true, quantity: true }
    });

    const list2Stocks = await prisma.portfolio.findMany({
      where: { userId: testUser.id, listId: list2.id },
      select: { id: true, symbol: true, quantity: true }
    });

    console.log(`📋 ${list1.name} contains:`, list1Stocks);
    console.log(`📋 ${list2.name} contains:`, list2Stocks);

    // Test: Delete TEST1 from list1
    console.log(`\n🗑️  Deleting TEST1 from ${list1.name} (ID: ${stock1.id})...`);
    
    await prisma.portfolio.delete({
      where: { id: stock1.id }
    });

    // Verify isolation
    console.log('\n✅ Verifying list isolation after deletion...');

    const list1AfterDelete = await prisma.portfolio.findMany({
      where: { userId: testUser.id, listId: list1.id },
      select: { id: true, symbol: true, quantity: true }
    });

    const list2AfterDelete = await prisma.portfolio.findMany({
      where: { userId: testUser.id, listId: list2.id },
      select: { id: true, symbol: true, quantity: true }
    });

    console.log(`📋 ${list1.name} after deletion:`, list1AfterDelete);
    console.log(`📋 ${list2.name} after deletion:`, list2AfterDelete);

    // Validate results
    const list1HasTest1 = list1AfterDelete.some(s => s.symbol === 'TEST1');
    const list2HasTest1 = list2AfterDelete.some(s => s.symbol === 'TEST1');
    const list1HasTest2 = list1AfterDelete.some(s => s.symbol === 'TEST2');

    console.log('\n🧪 Test Results:');
    console.log(`   ❌ TEST1 removed from ${list1.name}: ${!list1HasTest1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ✅ TEST1 still in ${list2.name}: ${list2HasTest1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ✅ TEST2 still in ${list1.name}: ${list1HasTest2 ? '✅ PASS' : '❌ FAIL'}`);

    const allTestsPass = !list1HasTest1 && list2HasTest1 && list1HasTest2;
    console.log(`\n🎯 Overall Result: ${allTestsPass ? '✅ ALL TESTS PASS - List isolation working!' : '❌ SOME TESTS FAILED'}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.portfolio.deleteMany({
      where: {
        userId: testUser.id,
        symbol: { in: ['TEST1', 'TEST2'] }
      }
    });

    console.log('✅ Test completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testListIsolation(); 