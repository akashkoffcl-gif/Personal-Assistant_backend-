const fs = require('fs');
const dotenv = fs.readFileSync('.env', 'utf8');
const dbUrlLine = dotenv.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.replace('DATABASE_URL=', '').trim().replace(/^"/, '').replace(/"$/, '');
const ipUrl = dbUrl.replace('aws-0-ap-northeast-1.pooler.supabase.com', '52.68.3.1');
console.log('Testing IP URL:', ipUrl.split('@')[1]);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: ipUrl } } });

prisma.user.findFirst().then(u => {
  console.log('IP connection SUCCESS! User:', u.id);
  process.exit(0);
}).catch(e => {
  console.error('IP connection FAIL:', e.message);
  process.exit(1);
});

