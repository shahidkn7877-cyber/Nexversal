const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const acts = await prisma.activity.findMany({
    where: {
      summary: {
        contains: 'presentation',
        mode: 'insensitive',
      },
    },
  });
  console.log(`Found ${acts.length} presentation activities:`);
  for (const a of acts) {
    console.log(`- ${a.id}: ${a.summary}`);
  }

  if (acts.length > 0) {
    const deleted = await prisma.activity.deleteMany({
      where: {
        summary: {
          contains: 'presentation',
          mode: 'insensitive',
        },
      },
    });
    console.log(`Deleted ${deleted.count} legacy presentation activities.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

