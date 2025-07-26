const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDefaultLists() {
  try {
    // Get all users without a default list
    const users = await prisma.user.findMany({
      include: {
        lists: {
          where: { isDefault: true }
        }
      }
    });

    for (const user of users) {
      if (user.lists.length === 0) {
        console.log(`Creating default list for user: ${user.email}`);
        await prisma.list.create({
          data: {
            userId: user.id,
            name: 'My Portfolio',
            description: 'Default portfolio list',
            isDefault: true
          }
        });
      }
    }

    console.log('Default lists created successfully');
  } catch (error) {
    console.error('Error creating default lists:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultLists(); 