import dns from 'dns';
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
import { PrismaClient } from '@prisma/client';

console.log('Testing PrismaClient direct query...');
const prisma = new PrismaClient({
  log: ['error', 'warn']
});

async function test() {
  try {
    const start = Date.now();
    const userCount = await prisma.user.count();
    console.log(`Success! User count: ${userCount} (in ${Date.now() - start}ms)`);
  } catch (err) {
    console.error('Prisma connection error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();

