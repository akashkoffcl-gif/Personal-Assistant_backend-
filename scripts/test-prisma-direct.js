const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.xeluxqrwaihtlbuuxdbv:Akashakdevspace@54.64.190.72:5432/postgres?sslmode=require&connection_limit=5&pool_timeout=30'
    }
  }
});

async function main() {
  console.log('Testing Prisma connection...');
  await p.$connect();
  const count = await p.task.count();
  console.log('PRISMA CONNECTED SUCCESSFULLY! Task count:', count);
  await p.$disconnect();
}

main().catch(err => {
  console.error('PRISMA ERROR:', err.message);
  process.exit(1);
});
