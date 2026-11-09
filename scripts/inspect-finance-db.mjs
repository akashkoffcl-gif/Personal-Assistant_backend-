import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const usdAccs = await prisma.financeAccount.findMany({ where: { currency: 'USD' } });
  const inrAccs = await prisma.financeAccount.findMany({ where: { currency: 'INR' } });
  console.log('USD accounts:', usdAccs.length, 'INR accounts:', inrAccs.length);

  const usdTx = await prisma.financeTransaction.findMany({ where: { currency: 'USD' } });
  const inrTx = await prisma.financeTransaction.findMany({ where: { currency: 'INR' } });
  console.log('USD tx:', usdTx.length, 'INR tx:', inrTx.length);

  const budgets = await prisma.financeBudget.findMany();
  console.log('FinanceBudget count:', budgets.length);

  const goals = await prisma.savingsGoal.findMany();
  console.log('SavingsGoal count:', goals.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
