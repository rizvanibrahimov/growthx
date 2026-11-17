const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.balanceHistory.deleteMany({});
  await prisma.trade.deleteMany({});
  await prisma.withdrawalRequest.deleteMany({});
  
  // Ahmet Kaya bakiyesini sıfırla (temiz başlangıç)
  await prisma.user.updateMany({
    data: {
      assignedBalance: 0,
      availableBalance: 0,
    }
  });

  console.log('✅ Tüm örnek veriler temizlendi! Kullanıcı bakiyesi $0.00 yapıldı.');
}

clean().catch(console.error).finally(() => prisma.$disconnect());
