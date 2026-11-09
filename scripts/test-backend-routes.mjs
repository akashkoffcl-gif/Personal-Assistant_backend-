import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '56e1cc13-e9af-45ef-81af-98c2b86c43b4';
const token = 'Bearer ' + jwt.sign(
  { sub: '00000000-0000-0000-0000-000000000001', email: 'demo@assistant.local', aud: 'authenticated', iss: 'supabase' },
  JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

const endpoints = [
  '/tasks',
  '/tasks?date=2026-11-03',
  '/projects',
  '/notifications?limit=10',
  '/automation/rules',
  '/plans/2026-11-03',
  '/finance/accounts',
  '/finance/analytics?month=2026-11',
  '/goals',
  '/goals/summary',
  '/knowledge/summary',
  '/knowledge/notes'
];

async function check() {
  console.log('Testing endpoints on http://localhost:3001/api/v1...');
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:3001/api/v1${ep}`, {
        headers: { Authorization: token }
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      console.log(`Endpoint: ${ep} => Status: ${res.status}`);
      if (res.status >= 400) {
        console.log(`  Error body:`, JSON.stringify(data).substring(0, 150));
      }
    } catch (e) {
      console.log(`Endpoint: ${ep} => Fetch Error: ${e.message}`);
    }
  }
}

check();
