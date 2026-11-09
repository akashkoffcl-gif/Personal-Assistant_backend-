const fs = require('fs');
const dotenv = fs.readFileSync('.env', 'utf8');
const dbUrlLine = dotenv.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.replace('DATABASE_URL=', '').trim().replace(/^"/, '').replace(/"$/, '');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function check() {
  const testKey = 'test-direct-key-1794116103609';
  const a = await prisma.aIAction.findUnique({ where: { idempotencyKey: testKey } });
  console.log('Record for test key:', JSON.stringify(a, null, 2));
  await prisma.$disconnect();
}
check();

