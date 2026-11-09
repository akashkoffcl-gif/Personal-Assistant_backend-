import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '56e1cc13-e9af-45ef-81af-98c2b86c43b4';
const token = 'Bearer ' + jwt.sign(
  { sub: '00000000-0000-0000-0000-000000000001', email: 'demo@assistant.local', aud: 'authenticated', iss: 'supabase' },
  JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

async function req(url, options = {}) {
  const res = await fetch(`http://localhost:3001/api/v1${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function main() {
  console.log('Seeding Phase 39 live database data for Selma...');

  // 1. Get existing accounts
  const existingAccounts = await req('/finance/accounts');
  let checkingAcc = Array.isArray(existingAccounts) ? existingAccounts.find(a => a.name.includes('Checking')) : null;
  let savingsAcc = Array.isArray(existingAccounts) ? existingAccounts.find(a => a.name.includes('Savings')) : null;

  if (!checkingAcc) {
    checkingAcc = await req('/finance/accounts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Main Checking (Chase)',
        type: 'CHECKING',
        initialBalance: 8450,
        currency: 'USD',
        color: '#8B45F5',
        isDefault: true
      })
    });
    console.log('Created checking account:', checkingAcc?.id || checkingAcc);
  }

  if (!savingsAcc) {
    savingsAcc = await req('/finance/accounts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'High-Yield Savings (Marcus)',
        type: 'SAVINGS',
        initialBalance: 24500,
        currency: 'USD',
        color: '#10B981',
        isDefault: false
      })
    });
    console.log('Created savings account:', savingsAcc?.id || savingsAcc);
  }

  // 2. Categories
  const existingCats = await req('/finance/categories');
  let salaryCat = Array.isArray(existingCats) ? existingCats.find(c => c.name.includes('Salary')) : null;
  let techCat = Array.isArray(existingCats) ? existingCats.find(c => c.name.includes('Office') || c.name.includes('Software')) : null;

  if (!salaryCat) {
    salaryCat = await req('/finance/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Client Retainer / Salary',
        type: 'INCOME',
        icon: 'briefcase',
        color: '#10B981'
      })
    });
    console.log('Created salary category:', salaryCat?.id || salaryCat);
  }

  if (!techCat) {
    techCat = await req('/finance/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Office & SaaS Tools',
        type: 'EXPENSE',
        icon: 'laptop',
        color: '#8B45F5'
      })
    });
    console.log('Created tech category:', techCat?.id || techCat);
  }

  // 3. Transactions
  const existingTx = await req('/finance/transactions?limit=10');
  const txList = Array.isArray(existingTx?.data) ? existingTx.data : (Array.isArray(existingTx) ? existingTx : []);

  if (checkingAcc?.id && txList.length === 0) {
    const tx1 = await req('/finance/transactions', {
      method: 'POST',
      body: JSON.stringify({
        accountId: checkingAcc.id,
        categoryId: salaryCat?.id,
        type: 'INCOME',
        amount: 9500,
        date: '2026-11-01',
        description: 'Monthly Client Retainer & Revenue',
        currency: 'USD'
      })
    });
    console.log('Created Income Tx:', tx1?.id || tx1);

    const tx2 = await req('/finance/transactions', {
      method: 'POST',
      body: JSON.stringify({
        accountId: checkingAcc.id,
        categoryId: techCat?.id,
        type: 'EXPENSE',
        amount: 1450,
        date: '2026-11-02',
        description: 'Cloud Infrastructure & Design Tools',
        currency: 'USD'
      })
    });
    console.log('Created Expense Tx:', tx2?.id || tx2);
  }

  // 4. Budget
  const existingBudgets = await req('/finance/budgets?month=2026-11');
  const bList = Array.isArray(existingBudgets) ? existingBudgets : [];
  if (techCat?.id && bList.length === 0) {
    const budget = await req('/finance/budgets', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: techCat.id,
        month: '2026-11',
        allocatedAmount: 2500
      })
    });
    console.log('Created budget:', budget?.id || budget);
  }

  // 5. Savings Goal
  const existingGoals = await req('/finance/savings-goals');
  const gList = Array.isArray(existingGoals) ? existingGoals : [];
  if (gList.length === 0) {
    const goal = await req('/finance/savings-goals', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Q4 Enterprise Reserve',
        targetAmount: 50000,
        initialAmount: 24500,
        targetDate: '2026-12-31',
        color: '#6366F1'
      })
    });
    console.log('Created savings goal:', goal?.id || goal);
  }

  // 6. Focus preferences
  await req('/focus/preferences', {
    method: 'PATCH',
    body: JSON.stringify({
      focusDurationMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      dailyTargetMinutes: 120
    })
  });
  console.log('Updated focus preferences.');

  console.log('Seeding complete! Verifying analytics:');
  const analytics = await req('/finance/analytics?month=2026-11');
  console.log('Live Analytics:', JSON.stringify(analytics, null, 2));
}

main().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
