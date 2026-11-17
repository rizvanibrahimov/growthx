import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('123456', 10);

  // GrowthX Primary Admin
  await prisma.admin.upsert({
    where: { email: 'admin@growthx.com' },
    update: {},
    create: {
      email: 'admin@growthx.com',
      passwordHash: adminHash,
      name: 'GrowthX Admin',
    },
  });

  // Legacy Admin for backwards compatibility
  await prisma.admin.upsert({
    where: { email: 'admin@cryptovault.com' },
    update: {},
    create: {
      email: 'admin@cryptovault.com',
      passwordHash: adminHash,
      name: 'Admin',
    },
  });

  // Default Investor User: Ahmet
  await prisma.user.upsert({
    where: { email: 'ahmet@email.com' },
    update: {},
    create: {
      email: 'ahmet@email.com',
      passwordHash: userHash,
      fullName: 'Ahmet Yilmaz',
      availableBalance: 500.0,
      phone: '+90 555 123 4567',
    },
  });

  console.log('✅ GrowthX Admin and Default User created successfully');

  const settings = [
    { key: 'withdrawal_min_amount', value: '100', description: 'Minimum çekim tutarı (USD)' },
    { key: 'withdrawal_methods', value: 'usdt_trc20,bank_transfer,btc', description: 'İzin verilen çekim yöntemleri' },
  ];

  for (const s of settings) {
    await prisma.systemSettings.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('✅ Sistem ayarları oluşturuldu');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
