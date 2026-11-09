import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const prisma = new PrismaClient();

async function inspectDb() {
  try {
    const maxConn = await prisma.$queryRawUnsafe('SHOW max_connections;');
    const activeConn = await prisma.$queryRawUnsafe('SELECT count(*) FROM pg_stat_activity;');
    console.log('Postgres max_connections:', maxConn);
    console.log('Current active connections in pg_stat_activity:', activeConn);
  } catch (err) {
    console.error('Error querying pg_stat:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
inspectDb();

