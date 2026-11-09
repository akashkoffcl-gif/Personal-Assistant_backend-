const fs = require('fs');
const dotenv = fs.readFileSync('.env', 'utf8');
const dbUrlLine = dotenv.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.replace('DATABASE_URL=', '').trim().replace(/^"/, '').replace(/"$/, '');
const directDbUrl = dbUrl.replace('aws-0-ap-northeast-1.pooler.supabase.com:5432', 'db.xeluxqrwaihtlbuuxdbv.supabase.co:5432')
                         .replace('postgres.xeluxqrwaihtlbuuxdbv:', 'postgres:');

const newDotenv = dotenv.split('\n').map(l => {
  if (l.startsWith('DATABASE_URL=')) return `DATABASE_URL="${directDbUrl}"`;
  if (l.startsWith('DIRECT_URL=')) return `DIRECT_URL="${directDbUrl}"`;
  return l;
}).join('\n');

fs.writeFileSync('.env', newDotenv);
fs.writeFileSync('apps/api/.env', newDotenv);
console.log('Successfully updated .env and apps/api/.env with direct Supabase connection URL!');

