import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const raw = await prisma.$queryRawUnsafe(`
      SELECT pid, state, query_start, wait_event_type, wait_event, query 
      FROM pg_stat_activity 
      WHERE state = 'active'
    `);
    console.log('Active queries:', raw);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();

