const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.xeluxqrwaihtlbuuxdbv:Akashakdevspace@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&pool_timeout=15'
    }
  }
});
async function loop() {
  for (let i = 1; i <= 5; i++) {
    const start = Date.now();
    const u = await prisma.user.findFirst();
    console.log('Query ' + i + ': ' + (Date.now() - start) + 'ms (User: ' + u.id + ')');
  }
}
loop().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

