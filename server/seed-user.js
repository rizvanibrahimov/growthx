const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function run() {
  const passwordHash = await bcrypt.hash('123456', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'ahmet@email.com' },
    update: {},
    create: {
      email: 'ahmet@email.com',
      passwordHash,
      fullName: 'Ahmet Kaya',
      assignedBalance: 5000,
      availableBalance: 7120.50,
      status: 'ACTIVE'
    }
  });

  // Admin ID'sini al
  const admin = await prisma.admin.findFirst();

  // Örnek işlemler
  await prisma.trade.createMany({
    data: [
      {
        userId: user.id,
        createdById: admin.id,
        asset: 'BTC/USDT',
        direction: 'BUY',
        leverage: '20x',
        entryPrice: 94200,
        exitPrice: 96500,
        quantity: 1,
        profitLoss: 2300,
        profitLossPercent: 2.44,
        status: 'CLOSED',
        notes: 'Telegram Long sinyali TP3 kapandı',
      },
      {
        userId: user.id,
        createdById: admin.id,
        asset: 'ETH/USDT',
        direction: 'SELL',
        leverage: '15x',
        entryPrice: 3450,
        exitPrice: 3470,
        quantity: 9,
        profitLoss: -180,
        profitLossPercent: -0.58,
        status: 'CLOSED',
        notes: 'Stop loss çalıştı',
      },
      {
        userId: user.id,
        createdById: admin.id,
        asset: 'SOL/USDT',
        direction: 'BUY',
        leverage: '10x',
        entryPrice: 235,
        exitPrice: null,
        quantity: 10,
        profitLoss: 0,
        profitLossPercent: 0,
        status: 'OPEN',
        notes: 'Telegram sinyali işlem açık devam ediyor',
      }
    ]
  });

  console.log('✅ Örnek kullanıcı ve işlemler oluşturuldu!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
