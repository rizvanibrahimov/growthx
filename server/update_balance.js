const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.update({
    where: { email: 'ahmet@email.com' },
    data: { availableBalance: 500.0 }
  });
  console.log(`Updated Ahmet balance to $${u.availableBalance}`);
  await prisma.$disconnect();
}

main().catch(console.error);
