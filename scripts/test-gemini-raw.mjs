import fs from 'fs';

const env = fs.readFileSync('d:/PT/apps/api/.env', 'utf8');
let apiKey = '';
env.split('\n').forEach(l => {
  if (l.startsWith('GEMINI_API_KEY=')) {
    apiKey = l.split('=')[1].trim().replace(/[\"\']/g, '');
  }
});

async function testKey() {
  console.log('Testing raw fetch with key...');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
  });
  console.log('URL key status:', res.status);
  const text = await res.text();
  console.log('URL key response:', text);

  // Also test with Authorization: Bearer
  const resBearer = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
  });
  console.log('Bearer status:', resBearer.status);
  const textBearer = await resBearer.text();
  console.log('Bearer response:', textBearer);
}
testKey();

