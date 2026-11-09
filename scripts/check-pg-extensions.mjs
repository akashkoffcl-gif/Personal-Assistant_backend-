import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('SUCCESS: pgvector extension enabled!');
  } catch (err) {
    console.log('NOTICE: pgvector not enabled or permission restricted:', err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
