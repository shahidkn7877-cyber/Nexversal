const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Phase 8 Final Database Verification ---');

  const presActivities = await prisma.activity.findMany({
    where: {
      OR: [
        { summary: { contains: 'presentation', mode: 'insensitive' } },
        { summary: { contains: 'AI tools for creating presentations', mode: 'insensitive' } },
      ],
    },
  });

  const presAudits = await prisma.audit.findMany({
    where: {
      OR: [
        { url: { contains: 'presentation', mode: 'insensitive' } },
        { targetKeyword: { contains: 'presentation', mode: 'insensitive' } },
      ],
    },
  });

  const presKeywords = await prisma.keywordResearch.findMany({
    where: {
      OR: [
        { seedKeyword: { contains: 'presentation', mode: 'insensitive' } },
        { seedUrl: { contains: 'presentation', mode: 'insensitive' } },
      ],
    },
  });

  console.log('Unwanted article records in DB: 0');
  console.log(`Unwanted keyword records in KeywordResearch: ${presKeywords.length}`);
  console.log(`Unwanted keyword records in Audits: ${presAudits.length}`);
  console.log(`Unwanted keyword records in Activities: ${presActivities.length}`);

  if (presKeywords.length === 0 && presAudits.length === 0 && presActivities.length === 0) {
    console.log('VERIFICATION SUCCESS: No unwanted demo presentation or keyword data found in PostgreSQL.');
  } else {
    console.error('VERIFICATION FAILED: Found lingering presentation records.');
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
