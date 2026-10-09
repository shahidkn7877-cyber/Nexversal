const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('=== DATABASE VERIFICATION ===');
  const kw = await prisma.keywordResearch.findMany({ include: { results: true } });
  console.log('Keyword Researches count:', kw.length);
  for (const k of kw) {
    console.log(` - ID: ${k.id} | Seed: "${k.seedKeyword}" | URL: "${k.seedUrl}" | User: ${k.userId} | Results: ${k.results.length}`);
  }

  const audits = await prisma.audit.findMany();
  console.log('\nAudits count:', audits.length);
  for (const a of audits) {
    console.log(` - ID: ${a.id} | URL: ${a.url} | Target Keyword: "${a.targetKeyword}" | User: ${a.userId}`);
  }

  const activities = await prisma.activity.findMany({ take: 5, orderBy: { timestamp: 'desc' } });
  console.log('\nActivities sample count:', activities.length);
  for (const act of activities) {
    console.log(` - ${act.type} | User: ${act.userId} | Summary: ${act.summary}`);
  }

  // Check for any mention of presentation or presentation keywords across all tables
  const activitiesWithPres = await prisma.activity.findMany({
    where: {
      OR: [
        { summary: { contains: 'presentation', mode: 'insensitive' } },
        { summary: { contains: 'AI tools for creating presentations', mode: 'insensitive' } },
      ],
    },
  });
  console.log('\nActivities mentioning presentation:', activitiesWithPres.length);

  const auditsWithPres = await prisma.audit.findMany({
    where: {
      OR: [
        { url: { contains: 'presentation', mode: 'insensitive' } },
        { targetKeyword: { contains: 'presentation', mode: 'insensitive' } },
      ],
    },
  });
  console.log('Audits mentioning presentation:', auditsWithPres.length);

  const kwWithPres = await prisma.keywordResearch.findMany({
    where: {
      OR: [
        { seedKeyword: { contains: 'presentation', mode: 'insensitive' } },
        { seedUrl: { contains: 'presentation', mode: 'insensitive' } },
      ],
    },
  });
  console.log('Keyword Researches mentioning presentation:', kwWithPres.length);

  await prisma.$disconnect();
}

check().catch((e) => {
  console.error(e);
  process.exit(1);
});

