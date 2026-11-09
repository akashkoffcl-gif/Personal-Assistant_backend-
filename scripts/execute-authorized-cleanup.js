const http = require('http');

const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'x-user-id': TEST_USER_ID,
        'x-user-email': `${TEST_USER_ID}@assistant.local`,
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') });
        } catch {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function cleanupDatabase() {
  console.log('================================================================');
  console.log('CLEANING UP MOCK, TEST, AND DUPLICATE DATA FOR DEPLOYMENT');
  console.log('Target API:', BASE_URL);
  console.log('User ID:', TEST_USER_ID);
  console.log('================================================================\n');

  // 1. Fetch all tasks
  const tasksRes = await request('GET', '/tasks');
  const tasks = tasksRes.data?.data || [];
  console.log(`Found ${tasks.length} total tasks.`);

  let deletedTasks = 0;
  for (const t of tasks) {
    const title = t.title || '';
    const isMockOrTest =
      title.startsWith('P51.') ||
      title.includes('Test') ||
      title.includes('Audit Reminder') ||
      title.includes('Idempotency') ||
      title === 'Walk 10,000 steps daily' ||
      title === 'Task 1: Core Implementation';

    if (isMockOrTest) {
      const del = await request('DELETE', `/tasks/${t.id}`);
      if (del.status === 200 || del.status === 204) {
        deletedTasks++;
        console.log(` - Deleted test task: [${t.id}] ${title}`);
      } else {
        console.warn(` - Failed to delete task [${t.id}]: status ${del.status}`);
      }
    }
  }
  console.log(`Cleaned up ${deletedTasks} test tasks.\n`);

  // 2. Fetch all projects
  const projectsRes = await request('GET', '/projects');
  const projects = projectsRes.data?.data || [];
  console.log(`Found ${projects.length} total projects.`);

  let deletedProjects = 0;
  const seenTitles = new Set();

  for (const p of projects) {
    const title = p.title || '';
    const isMockOrTest =
      title.startsWith('P51.') ||
      title.includes('Test') ||
      title.includes('Idempotency') ||
      title.includes('Phase 51.');

    // Also deduplicate: if title was already seen, remove duplicates
    const isDuplicate = seenTitles.has(title.toLowerCase().trim());

    if (isMockOrTest || isDuplicate) {
      const del = await request('DELETE', `/projects/${p.id}`);
      if (del.status === 200 || del.status === 204) {
        deletedProjects++;
        console.log(` - Deleted ${isDuplicate ? 'duplicate' : 'test'} project: [${p.id}] ${title}`);
      } else {
        console.warn(` - Failed to delete project [${p.id}]: status ${del.status}`);
      }
    } else {
      seenTitles.add(title.toLowerCase().trim());
    }
  }
  console.log(`Cleaned up ${deletedProjects} test/duplicate projects.\n`);

  // 3. Clean up test knowledge note
  const notesRes = await request('GET', '/knowledge/notes');
  const notes = notesRes.data?.data || [];
  console.log(`Found ${notes.length} knowledge notes.`);
  for (const n of notes) {
    if (n.title.includes('Test') || n.title.includes('Prompt Injection')) {
      await request('DELETE', `/knowledge/notes/${n.id}`);
      console.log(` - Deleted test note: [${n.id}] ${n.title}`);
    }
  }

  // 4. Clean up test finance transaction
  const financeRes = await request('GET', '/finance/transactions');
  const transactions = financeRes.data?.data || [];
  console.log(`\nFound ${transactions.length} finance transactions.`);
  for (const tx of transactions) {
    if (tx.description && (tx.description.includes('P51') || tx.description.includes('Test') || tx.description.includes('Idempotency'))) {
      await request('DELETE', `/finance/transactions/${tx.id}`);
      console.log(` - Deleted test transaction: [${tx.id}] ${tx.description}`);
    }
  }

  // Final verification
  console.log('\n================================================================');
  console.log('FINAL DATABASE VERIFICATION:');
  const remainingTasks = (await request('GET', '/tasks')).data?.data || [];
  const remainingProjects = (await request('GET', '/projects')).data?.data || [];
  const remainingNotes = (await request('GET', '/knowledge/notes')).data?.data || [];
  const remainingFinance = (await request('GET', '/finance/transactions')).data?.data || [];

  console.log('Remaining clean tasks:', remainingTasks.length);
  remainingTasks.forEach(t => console.log(`   * [Task] ${t.title} (${t.status})`));
  console.log('Remaining clean projects:', remainingProjects.length);
  remainingProjects.forEach(p => console.log(`   * [Project] ${p.title} (${p.status})`));
  console.log('Remaining clean notes:', remainingNotes.length);
  remainingNotes.forEach(n => console.log(`   * [Note] ${n.title}`));
  console.log('Remaining clean finance transactions:', remainingFinance.length);
  console.log('================================================================');
}

cleanupDatabase();

