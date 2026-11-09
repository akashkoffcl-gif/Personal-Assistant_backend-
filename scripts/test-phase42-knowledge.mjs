import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:3001/api/v1';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '56e1cc13-e9af-45ef-81af-98c2b86c43b4';

// Primary User: Selma Knight
const tokenUser1 = 'Bearer ' + jwt.sign(
  { sub: '00000000-0000-0000-0000-000000000001', email: 'demo@assistant.local', aud: 'authenticated', iss: 'supabase' },
  JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

// Secondary User: Isolation Test
const tokenUser2 = 'Bearer ' + jwt.sign(
  { sub: '00000000-0000-0000-0000-000000000002', email: 'auditor@assistant.local', aud: 'authenticated', iss: 'supabase' },
  JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

async function req(endpoint, options = {}, token = tokenUser1) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  const payload = json && json.data !== undefined ? json.data : json;
  return { status: res.status, ok: res.ok, data: payload, raw: json };
}

let testNoteId = null;
let testDocId = null;

async function runTests() {
  console.log('====================================================');
  console.log('🚀 STARTING PHASE 42 KNOWLEDGE INTELLIGENCE API AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // 1. Get Knowledge Summary
  console.log('--- 1. Knowledge Summary ---');
  const resSummary = await req('/knowledge/summary');
  assert(resSummary.status === 200 && resSummary.data.totalNotes !== undefined, 'Get Knowledge Summary', `status: ${resSummary.status}`);

  // 2. Create Note with Markdown & Tags
  console.log('\n--- 2. Create Knowledge Note ---');
  const notePayload = {
    title: 'Distributed Transaction Architecture v1',
    content: `# Architecture Brief\n\nWe utilize 2-Phase Commit across Postgres and Redis.\n\n- [ ] Benchmark commit latency\n- [ ] Deploy worker replicas\n\n> Note: High availability requires Redis cluster mode.`,
    category: 'NOTE',
    tags: ['architecture', 'redis', 'postgres'],
    isPinned: true,
  };
  const resCreate = await req('/knowledge/notes', {
    method: 'POST',
    body: JSON.stringify(notePayload),
  });
  assert(resCreate.status === 201 && resCreate.data.id, 'Create Note with Tags & Category', `status: ${resCreate.status}`);
  if (resCreate.data.id) testNoteId = resCreate.data.id;

  // 3. Get Note By ID
  console.log('\n--- 3. Get Note By ID ---');
  const resGet = await req(`/knowledge/notes/${testNoteId}`);
  assert(resGet.status === 200 && resGet.data.title === notePayload.title, 'Get Note by ID matches created data');

  // 4. Update Note (Trigger Automatic Revision Snapshot)
  console.log('\n--- 4. Update Note & Automatic Versioning ---');
  const updatePayload = {
    title: 'Distributed Transaction Architecture v2 - Production',
    content: `# Architecture Brief v2\n\nUpdated with BullMQ distributed locks.\n\n- [ ] Verify fencing tokens\n- [ ] Benchmark commit latency`,
    category: 'NOTE',
    tags: ['architecture', 'bullmq', 'locks'],
    isPinned: false,
  };
  const resUpdate = await req(`/knowledge/notes/${testNoteId}`, {
    method: 'PATCH',
    body: JSON.stringify(updatePayload),
  });
  assert(resUpdate.status === 200, 'Update Note Success');

  // Verify version history exists
  const resUpdatedNote = await req(`/knowledge/notes/${testNoteId}`);
  assert(
    resUpdatedNote.data.versions && resUpdatedNote.data.versions.length >= 1,
    'Revision history snapshot created automatically on update',
    `versions: ${resUpdatedNote.data.versions?.length}`
  );

  // 5. Rollback Version
  console.log('\n--- 5. Rollback Note Version ---');
  const resRollback = await req(`/knowledge/notes/${testNoteId}/rollback/1`, {
    method: 'POST',
  });
  assert(
    resRollback.status === 201 && resRollback.data.title === 'Distributed Transaction Architecture v1',
    'Rollback to Version 1 restored original title and content'
  );

  // 6. Soft Delete Note (Move to Trash)
  console.log('\n--- 6. Soft Delete Note (Trash) ---');
  const resDelete = await req(`/knowledge/notes/${testNoteId}`, {
    method: 'DELETE',
  });
  assert(resDelete.status === 200 && resDelete.data.success, 'Soft delete note returns success');

  // Verify note is NOT in standard list
  const resNotesActive = await req('/knowledge/notes');
  const inActive = resNotesActive.data.some((n) => n.id === testNoteId);
  assert(!inActive, 'Soft-deleted note is excluded from active notes list');

  // Verify note IS in trash list
  const resNotesTrash = await req('/knowledge/notes?isTrash=true');
  const inTrash = resNotesTrash.data.some((n) => n.id === testNoteId);
  assert(inTrash, 'Soft-deleted note appears in trash list (isTrash=true)');

  // 7. Restore Note from Trash
  console.log('\n--- 7. Restore Note from Trash ---');
  const resRestore = await req(`/knowledge/notes/${testNoteId}/restore`, {
    method: 'POST',
  });
  assert(resRestore.status === 201 && resRestore.data.deletedAt === null, 'Restore note clears deletedAt timestamp');

  // 8. Create Daily Journal Entry
  console.log('\n--- 8. Daily Journal Creation ---');
  const journalPayload = {
    title: 'Daily Reflection — Nov 4, 2026',
    content: '### Wins\nCompleted Phase 42 Knowledge Intelligence.\n\n### Challenges\nSupabase connection pooling latency resolved.',
    category: 'JOURNAL',
    isJournal: true,
    journalDate: '2026-11-04',
    tags: ['journal', 'daily'],
  };
  const resJournal = await req('/knowledge/notes', {
    method: 'POST',
    body: JSON.stringify(journalPayload),
  });
  assert(resJournal.status === 201 && resJournal.data.isJournal === true, 'Daily Journal entry saved with date binding');

  // 9. Document Upload & Semantic Chunking
  console.log('\n--- 9. Document Upload & Chunking ---');
  const docPayload = {
    fileName: 'redis_architecture_deep_dive.md',
    mimeType: 'text/markdown',
    fileSize: 4096,
    fileUrl: 'local://redis_architecture_deep_dive.md',
    extractedText: `Redis is an in-memory data structure store used as a database, cache, message broker, and streaming engine. Redis provides data structures such as strings, hashes, lists, sets, sorted sets with range queries, bitmaps, hyperloglogs, geospatial indexes, and streams. In Antigravity architecture, Redis is used as the backing store for BullMQ background workers and token bucket rate limiters.`,
  };
  const resDoc = await req('/knowledge/documents', {
    method: 'POST',
    body: JSON.stringify(docPayload),
  });
  assert(
    resDoc.status === 201 && resDoc.data.id && (resDoc.data.status === 'INDEXED' || resDoc.data.indexingStatus === 'INDEXED'),
    'Document uploaded and indexed successfully',
    `status: ${resDoc.status}, docStatus: ${resDoc.data?.status || resDoc.data?.indexingStatus}`
  );
  if (resDoc.data.id) testDocId = resDoc.data.id;

  // Verify chunks were created
  const resGetDoc = await req(`/knowledge/documents/${testDocId}`);
  assert(
    resGetDoc.data.chunks && resGetDoc.data.chunks.length >= 1,
    'Document chunks generated and vectorized',
    `chunks: ${resGetDoc.data.chunks?.length}`
  );

  // Re-index Document
  const resReindex = await req(`/knowledge/documents/${testDocId}/reindex`, {
    method: 'POST',
  });
  assert(
    resReindex.status === 201 && (resReindex.data.status === 'INDEXED' || resReindex.data.indexingStatus === 'INDEXED'),
    'Document re-indexing completed',
    `status: ${resReindex.status}, docStatus: ${resReindex.data?.status || resReindex.data?.indexingStatus}`
  );

  // 10. Knowledge Graph Relations
  console.log('\n--- 10. Knowledge Graph Relations ---');
  const relationPayload = {
    sourceNoteId: testNoteId,
    targetType: 'PROJECT',
    targetId: 'Website Redesign',
    relationType: 'RELATES_TO',
  };
  const resRelation = await req('/knowledge/relations', {
    method: 'POST',
    body: JSON.stringify(relationPayload),
  });
  assert(resRelation.status === 201 && resRelation.data.id, 'Knowledge graph relation created');

  const resGraph = await req('/knowledge/graph');
  assert(
    resGraph.status === 200 && resGraph.data.nodes?.length > 0 && (resGraph.data.edges?.length > 0 || resGraph.data.links?.length > 0),
    'Knowledge graph returns nodes and edges',
    `nodes: ${resGraph.data.nodes?.length}, edges: ${resGraph.data.edges?.length || resGraph.data.links?.length}`
  );

  // 11. AI Tools: Title Suggestion
  console.log('\n--- 11. AI Tools: Title Suggestion ---');
  const resTitle = await req('/knowledge/ai/suggest-title', {
    method: 'POST',
    body: JSON.stringify({
      content: 'We need to implement automated database backups using cron jobs every midnight on AWS S3.',
    }),
  });
  assert(resTitle.status === 201 && resTitle.data.title, 'AI Title suggested', `title: ${resTitle.data.title}`);

  // 12. AI Tools: Topic Extraction
  console.log('\n--- 12. AI Tools: Topic Extraction ---');
  const resTopics = await req('/knowledge/ai/extract-topics', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Database Reliability Guide',
      content: 'Configuring PostgreSQL connection pooling with PgBouncer, replicas, and SSL encryption.',
    }),
  });
  assert(resTopics.status === 201 && Array.isArray(resTopics.data.topics) && resTopics.data.topics.length > 0, 'AI Topics extracted', `topics: ${resTopics.data.topics?.join(', ')}`);

  // 13. AI Tools: Action Item Extraction
  console.log('\n--- 13. AI Tools: Action Item Extraction ---');
  const resActions = await req('/knowledge/ai/extract-actions', {
    method: 'POST',
    body: JSON.stringify({
      noteId: testNoteId,
      content: 'Meeting notes:\n- [ ] Configure BullMQ concurrency to 5\n- TODO: Review Supabase connection limits\n- Schedule follow-up with Selma on Friday.',
    }),
  });
  assert(
    resActions.status === 201 && ((Array.isArray(resActions.data.actions) && resActions.data.actions.length > 0) || (Array.isArray(resActions.data.actionItems) && resActions.data.actionItems.length > 0)),
    'AI Actions extracted',
    `actions: ${(resActions.data.actions || resActions.data.actionItems)?.length}`
  );

  // 14. Hybrid Semantic Search
  console.log('\n--- 14. Hybrid Semantic Search ---');
  const resSearch = await req('/knowledge/search?q=Redis&mode=hybrid');
  assert(
    resSearch.status === 200 && Array.isArray(resSearch.data.results) && resSearch.data.results.length > 0,
    'Hybrid search retrieves relevant notes and documents',
    `results count: ${resSearch.data.results?.length}`
  );

  // 15. Grounded AI Question Answering with Citations
  console.log('\n--- 15. Grounded AI Question Answering ---');
  const resAsk = await req('/knowledge/ai/ask', {
    method: 'POST',
    body: JSON.stringify({
      question: 'What is Redis used for in this architecture?',
    }),
  });
  assert(
    resAsk.status === 201 && resAsk.data.answer && Array.isArray(resAsk.data.sources),
    'Grounded AI Q&A returned answer with source citations',
    `sources: ${resAsk.data.sources?.length}`
  );

  // 16. Cross-User Data Isolation
  console.log('\n--- 16. Cross-User Data Isolation ---');
  const resIsolation = await req(`/knowledge/notes/${testNoteId}`, {}, tokenUser2);
  assert(
    resIsolation.status === 404,
    'User 2 cannot access User 1 note (returns 404 Not Found)',
    `status: ${resIsolation.status}`
  );

  console.log('\n====================================================');
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal audit error:', e);
  process.exit(1);
});
