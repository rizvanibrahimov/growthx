const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testWithdrawalDeduction() {
  const user = await prisma.user.findUnique({ where: { email: 'ahmet@email.com' } });
  console.log('Ahmet initial balance:', user.availableBalance);
  
  // Set balance to 500 for testing
  await prisma.user.update({
    where: { id: user.id },
    data: { availableBalance: 500.0 }
  });
  console.log('Set Ahmet balance to $500.00 for testing');
  
  await prisma.$disconnect();
}

testWithdrawalDeduction().catch(console.error);
