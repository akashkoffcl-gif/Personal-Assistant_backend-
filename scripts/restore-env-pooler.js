const fs = require('fs');
const dotenv = fs.readFileSync('.env', 'utf8');
const originalUrl = 'postgresql://postgres.xeluxqrwaihtlbuuxdbv:Akashakdevspace@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&pool_timeout=15';

const newDotenv = dotenv.split('\n').map(l => {
  if (l.startsWith('DATABASE_URL=')) return `DATABASE_URL="${originalUrl}"`;
  if (l.startsWith('DIRECT_URL=')) return `DIRECT_URL="${originalUrl}"`;
  return l;
}).join('\n');

fs.writeFileSync('.env', newDotenv);
fs.writeFileSync('apps/api/.env', newDotenv);
console.log('Restored original pooler hostname in .env and apps/api/.env');

