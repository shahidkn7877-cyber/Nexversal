const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:Sh%40hid562123@db.chlbhboyodqsktnkyzhr.supabase.co:5432/postgres?schema=public&connection_limit=3&pool_timeout=30&connect_timeout=30'
    }
  }
});
async function test() {
  const start = Date.now();
  console.log('Connecting...');
  try {
    await prisma.$connect();
    console.log(`Connected in ${Date.now() - start}ms`);
    const c = await prisma.user.count();
    console.log(`User count: ${c} in total ${Date.now() - start}ms`);
  } catch (e) {
    console.error('Failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

