const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const testKey = 'test-cas-reclaim-' + Date.now();

  await prisma.aIAction.create({
    data: {
      userId: '00000000-0000-0000-0000-000000000001',
      actionType: 'DOMAIN_STEP_IDEMPOTENCY',
      description: 'CAS test claim',
      status: 'PENDING',
      idempotencyKey: testKey,
      payload: {
        toolId: 'create_project',
        claimToken: 'token-A',
        status: 'CLAIMED',
        claimedAt: new Date(Date.now() - 20000).toISOString()
      }
    }
  });

  const res1 = await prisma.aIAction.updateMany({
    where: {
      idempotencyKey: testKey,
      status: 'PENDING',
      payload: {
        path: ['claimToken'],
        equals: 'token-A'
      }
    },
    data: {
      payload: {
        toolId: 'create_project',
        claimToken: 'token-B',
        status: 'RECLAIMED',
        claimedAt: new Date().toISOString()
      }
    }
  });
  console.log('UpdateMany with JSON path equals count:', res1.count);

  await prisma.aIAction.deleteMany({ where: { idempotencyKey: testKey } });
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error in test:', err);
  process.exit(1);
});
