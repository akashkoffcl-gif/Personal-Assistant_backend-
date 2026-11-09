const http = require('http');

const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

function request(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'x-user-id': TEST_USER_ID,
        'x-user-email': `${TEST_USER_ID}@assistant.local`
      }
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') });
        } catch {
          resolve({ status: res.statusCode, data: buf });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function verify() {
  const [tasksRes, projectsRes, notesRes] = await Promise.all([
    request('GET', '/tasks'),
    request('GET', '/projects'),
    request('GET', '/notes')
  ]);

  console.log('--- CURRENT ACTIVE PRODUCTION-READY INVENTORY ---');
  console.log('Projects (' + (projectsRes.data?.data?.length || 0) + '):', projectsRes.data?.data?.map(p => ({ id: p.id, name: p.name })));
  console.log('Tasks (' + (tasksRes.data?.data?.length || 0) + '):', tasksRes.data?.data?.map(t => ({ id: t.id, title: t.title, projectId: t.projectId })));
  console.log('Notes (' + (notesRes.data?.data?.length || 0) + '):', notesRes.data?.data?.map(n => ({ id: n.id, title: n.title })));
  console.log('-------------------------------------------------');
}

verify().catch(console.error);
