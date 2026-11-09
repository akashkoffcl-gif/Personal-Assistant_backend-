import fs from 'fs';
import dns from 'dns';

// Ensure IPv4 first
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const env = fs.readFileSync('d:/PT/apps/api/.env', 'utf8');
env.split('\n').forEach(l => {
  if (l.startsWith('DATABASE_URL') || l.startsWith('DIRECT_URL')) {
    const parts = l.split('=');
    const raw = parts.slice(1).join('=').trim().replace(/[;\"\']/g, '');
    const u = new URL(raw);
    console.log(parts[0], {
      host: u.host,
      port: u.port,
      search: u.search
    });
  }
});

