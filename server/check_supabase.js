const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSupabase() {
  const users = await prisma.user.findMany();
  console.log('Users in Supabase:', JSON.stringify(users, null, 2));
  const admins = await prisma.admin.findMany();
  console.log('Admins in Supabase:', JSON.stringify(admins, null, 2));
  await prisma.$disconnect();
}

checkSupabase().catch(console.error);
