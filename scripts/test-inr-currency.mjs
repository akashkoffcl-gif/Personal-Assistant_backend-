import { PrismaClient } from '@prisma/client';

// Inline test of formatINR logic to match apps/web/src/lib/currency.ts
export function formatINR(
  amount,
  options = {}
) {
  const { isMasked = false, maximumFractionDigits = 2, minimumFractionDigits = 2 } = options;
  if (isMasked) return '••••••';
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '₹0.00';

  const numericValue = typeof amount === 'string' ? parseFloat(amount) || 0 : Number(amount);

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericValue);
}

async function runTests() {
  console.log('=== TEST 1: INR FORMATTING SPECIFICATION & INDIAN DIGIT GROUPING ===');
  
  const testCases = [
    { input: 0, expected: '₹0.00', desc: 'Zero balance' },
    { input: 450.5, expected: '₹450.50', desc: 'Paise precision' },
    { input: 1000, expected: '₹1,000.00', desc: 'Thousands' },
    { input: 100000, expected: '₹1,00,000.00', desc: 'One Lakh (Indian grouping: 1,00,000)' },
    { input: 10000000, expected: '₹1,00,00,000.00', desc: 'One Crore (Indian grouping: 1,00,00,000)' },
    { input: 417500.75, expected: '₹4,17,500.75', desc: 'Audit checking balance' },
  ];

  let passCount = 0;
  for (const tc of testCases) {
    const formatted = formatINR(tc.input);
    const passed = formatted === tc.expected;
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${tc.desc}: Input=${tc.input} -> Output="${formatted}" (Expected="${tc.expected}")`);
    if (passed) passCount++;
  }

  // Masking test
  const masked = formatINR(500000, { isMasked: true });
  const maskedPass = masked === '••••••';
  console.log(`  [${maskedPass ? 'PASS' : 'FAIL'}] Privacy Masking: Output="${masked}" (Expected="••••••")`);
  if (maskedPass) passCount++;

  console.log('\n=== TEST 2: DATABASE CURRENCY INTEGRITY & MIGRATION SAFETY ===');
  const prisma = new PrismaClient();
  try {
    const usdAccounts = await prisma.financeAccount.findMany({ where: { currency: 'USD' } });
    const inrAccounts = await prisma.financeAccount.findMany({ where: { currency: 'INR' } });
    console.log(`  Accounts: USD=${usdAccounts.length}, INR=${inrAccounts.length}`);

    const usdTransactions = await prisma.financeTransaction.findMany({ where: { currency: 'USD' } });
    const inrTransactions = await prisma.financeTransaction.findMany({ where: { currency: 'INR' } });
    console.log(`  Transactions: USD=${usdTransactions.length}, INR=${inrTransactions.length}`);

    const dbPass = usdAccounts.length === 0 && usdTransactions.length === 0 && inrAccounts.length > 0;
    console.log(`  [${dbPass ? 'PASS' : 'FAIL'}] Database Currency Semantics: No orphaned USD accounts or transactions remain.`);

    console.log(`\n=== INR CURRENCY AUDIT RESULT: ${passCount === testCases.length + 1 && dbPass ? 'ALL TESTS PASSED' : 'DEFECTS FOUND'} ===`);
  } catch (err) {
    console.error('Database connection error during test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();

