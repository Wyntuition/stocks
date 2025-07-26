const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestList() {
  try {
    // Find test user
    const testUser = await prisma.user.findFirst({
      where: { email: 'test@example.com' }
    });

    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }

    // Create second test list
    const list2 = await prisma.list.create({
      data: {
        userId: testUser.id,
        name: 'Test List 2',
        description: 'Second test list for isolation testing'
      }
    });

    console.log(`✅ Created test list: ${list2.name} (${list2.id})`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestList(); 