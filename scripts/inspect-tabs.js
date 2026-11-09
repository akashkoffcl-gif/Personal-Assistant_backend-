const fs = require('fs');
const page = fs.readFileSync('apps/web/src/app/page.tsx', 'utf8');
console.log('File length:', page.length);
const matches = page.match(/activeTab\s*===?\s*['"][^'"]+['"]/g) || [];
const tabs = matches.map(m => m.replace(/activeTab\s*===?\s*/, '').replace(/['"]/g, ''));
console.log('Unique tabs found in page.tsx:');
console.log([...new Set(tabs)]);

