import fs from 'fs';
import path from 'path';

function scan(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) scan(full);
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        if (l.includes('USD') || (l.includes('$') && !l.includes('${') && !l.includes('style={{') && !l.includes('$disconnect') && !l.includes('prisma.$') && !l.includes('ref='))) {
          console.log(`${full}:${idx + 1}: ${l.trim()}`);
        }
      });
    }
  }
}

scan('apps/web/src');
scan('apps/api/src');

