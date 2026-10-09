const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log('--- PUBLIC TABLES ---');
  for (const row of tables) {
    const table = row.table_name;
    const countRes = await prisma.$queryRawUnsafe(`SELECT count(*) as cnt FROM "${table}"`);
    console.log(`Table: ${table} | Count: ${countRes[0].cnt}`);
  }

  // Inspect keyword_researches
  console.log('\n--- KEYWORD RESEARCHES ---');
  const kwRecords = await prisma.keywordResearch.findMany({
    include: { results: true },
  });
  console.log('Keyword Researches found:', kwRecords.length);
  for (const kw of kwRecords) {
    console.log(JSON.stringify({
      id: kw.id,
      userId: kw.userId,
      provider: kw.provider,
      seedKeyword: kw.seedKeyword,
      seedUrl: kw.seedUrl,
      resultsCount: kw.results.length,
      createdAt: kw.createdAt,
    }));
  }

  // Inspect audits
  console.log('\n--- AUDITS ---');
  const audits = await prisma.audit.findMany();
  console.log('Audits found:', audits.length);
  for (const a of audits) {
    console.log(JSON.stringify({
      id: a.id,
      url: a.url,
      targetKeyword: a.targetKeyword,
      score: a.score,
      userId: a.userId,
      timestamp: a.timestamp,
    }));
  }

  // Inspect users
  console.log('\n--- USERS ---');
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
  });
  console.log('Users found:', users.length);
  for (const u of users) {
    console.log(JSON.stringify(u));
  }

  // Inspect activities
  console.log('\n--- ACTIVITIES ---');
  const activities = await prisma.activity.findMany({
    take: 10,
    orderBy: { timestamp: 'desc' },
  });
  console.log('Activities (last 10):', activities.length);
  for (const act of activities) {
    console.log(JSON.stringify({
      id: act.id,
      type: act.type,
      userId: act.userId,
      summary: act.summary,
      timestamp: act.timestamp,
    }));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

