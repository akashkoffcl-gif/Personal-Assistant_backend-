const dns = require('dns');
const fs = require('fs');

dns.lookup('aws-0-ap-northeast-1.pooler.supabase.com', { family: 6 }, (err, addr) => {
  if (err || !addr) {
    console.error('Failed to resolve IPv6:', err);
    process.exit(1);
  }
  console.log('Resolved stable IPv6:', addr);
  const dotenv = fs.readFileSync('.env', 'utf8');
  const ipv6Url = `postgresql://postgres.xeluxqrwaihtlbuuxdbv:Akashakdevspace@[${addr}]:5432/postgres?sslmode=require&connection_limit=5&pool_timeout=15`;
  
  const newDotenv = dotenv.split('\n').map(l => {
    if (l.startsWith('DATABASE_URL=')) return `DATABASE_URL="${ipv6Url}"`;
    if (l.startsWith('DIRECT_URL=')) return `DIRECT_URL="${ipv6Url}"`;
    return l;
  }).join('\n');

  fs.writeFileSync('.env', newDotenv);
  fs.writeFileSync('apps/api/.env', newDotenv);
  console.log('Successfully set DATABASE_URL and DIRECT_URL to bracketed IPv6 pooler!');
});

