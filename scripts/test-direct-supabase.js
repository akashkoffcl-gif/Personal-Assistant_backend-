const fs = require('fs');
const dotenv = fs.readFileSync('.env', 'utf8');
const dbUrlLine = dotenv.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.replace('DATABASE_URL=', '').trim().replace(/^"/, '').replace(/"$/, '');
const directDbUrl = dbUrl.replace('aws-0-ap-northeast-1.pooler.supabase.com:5432', 'db.xeluxqrwaihtlbuuxdbv.supabase.co:5432')
                         .replace('postgres.xeluxqrwaihtlbuuxdbv:', 'postgres:');

console.log('Testing direct host URL host:', directDbUrl.split('@')[1]);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: directDbUrl } } });

async function run() {
  try {
    const u = await prisma.user.findFirst();
    console.log('Direct host connection SUCCESS! User:', u ? u.id : 'none');
    process.exit(0);
  } catch (err) {
    console.error('Direct host connection FAIL:', err.message);
    process.exit(1);
  }
}
run();

