const fs = require('fs');
const dotenv = fs.readFileSync('.env', 'utf8');
const dbUrlLine = dotenv.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.replace('DATABASE_URL=', '').trim().replace(/^"/, '').replace(/"$/, '');

console.log('Testing url host:', dbUrl.split('@')[1]);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function run() {
  try {
    const u = await prisma.user.findFirst();
    console.log('Direct test SUCCESS! User:', u ? u.id : 'none');
    process.exit(0);
  } catch (err) {
    console.error('Direct test FAILED:', err.message);
    process.exit(1);
  }
}

run();

