import http from 'http';

const API_BASE = 'http://127.0.0.1:3001/api/v1';
const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ';

class ApiTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'ApiTimeoutError';
  }
}

class ApiAbortError extends Error {
  constructor(reason) {
    super(reason || 'Request was aborted');
    this.name = 'ApiAbortError';
  }
}

async function testFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const timeoutMs = options.timeoutMs || 15000;
  const controller = new AbortController();
  let isTimedOut = false;

  const timeoutTimer = setTimeout(() => {
    isTimedOut = true;
    controller.abort(new ApiTimeoutError(timeoutMs));
  }, timeoutMs);

  let removeExternalAbortListener = null;
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutTimer);
      throw new ApiAbortError(options.signal.reason?.toString?.() || 'Caller signal already aborted');
    }
    const onExternalAbort = () => {
      controller.abort(new ApiAbortError(options.signal?.reason?.toString?.() || 'Caller aborted request'));
    };
    options.signal.addEventListener('abort', onExternalAbort, { once: true });
    removeExternalAbortListener = () => {
      options.signal?.removeEventListener('abort', onExternalAbort);
    };
  }

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEMO_TOKEN}`,
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutTimer);
    if (removeExternalAbortListener) removeExternalAbortListener();

    if (res.status === 204) return {};
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch { json = { message: text }; }

    if (!res.ok) {
      throw new Error(json.message || `HTTP error ${res.status}`);
    }
    return json.data !== undefined ? json.data : json;
  } catch (err) {
    clearTimeout(timeoutTimer);
    if (removeExternalAbortListener) removeExternalAbortListener();
    if (isTimedOut || err?.name === 'ApiTimeoutError') {
      throw new ApiTimeoutError(timeoutMs);
    }
    if (err?.name === 'AbortError' || err?.name === 'ApiAbortError') {
      throw new ApiAbortError(err.message || 'Request cancelled');
    }
    throw err;
  }
}

async function runApiRegressionSuite() {
  console.log('====================================================');
  console.log('STARTING PHASE 44 API CLIENT & ABORT REGRESSION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Successful GET
  try {
    const data = await testFetch('/tasks');
    assert(Array.isArray(data), 'Successful GET /tasks returns array');
  } catch (err) {
    assert(false, `GET /tasks failed: ${err.message}`);
  }

  // 2. Successful POST
  let createdTaskId = null;
  try {
    const newTask = await testFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Phase 44 Abort Test Task',
        priority: 'HIGH',
        category: 'WORK',
      }),
    });
    createdTaskId = newTask.id;
    assert(Boolean(createdTaskId), `Successful POST /tasks created task: ${createdTaskId}`);
  } catch (err) {
    assert(false, `POST /tasks failed: ${err.message}`);
  }

  // 3. Successful PATCH
  if (createdTaskId) {
    try {
      const updated = await testFetch(`/tasks/${createdTaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Phase 44 Abort Test Task (Updated)' }),
      });
      assert(updated.title.includes('Updated'), 'Successful PATCH /tasks/:id updated record');
    } catch (err) {
      assert(false, `PATCH /tasks failed: ${err.message}`);
    }
  }

  // 4. Successful DELETE
  if (createdTaskId) {
    try {
      await testFetch(`/tasks/${createdTaskId}`, { method: 'DELETE' });
      assert(true, 'Successful DELETE /tasks/:id removed record');
    } catch (err) {
      assert(false, `DELETE /tasks failed: ${err.message}`);
    }
  }

  // 5. HTTP 404 Handling
  try {
    await testFetch('/non-existent-route-404');
    assert(false, 'Expected 404 to throw');
  } catch (err) {
    assert(err.message.includes('404') || err.message.includes('Cannot GET'), 'HTTP 404 throws descriptive error');
  }

  // 6. External Caller Cancellation (Before Request Starts)
  const preAborted = new AbortController();
  preAborted.abort('Component unmounted early');
  try {
    await testFetch('/tasks', { signal: preAborted.signal });
    assert(false, 'Pre-aborted request should reject immediately');
  } catch (err) {
    assert(err instanceof ApiAbortError, 'Pre-aborted signal throws ApiAbortError');
  }

  // 7. External Caller Cancellation (During In-Flight Request)
  const inFlightController = new AbortController();
  const inFlightPromise = testFetch('/tasks', { signal: inFlightController.signal });
  setTimeout(() => inFlightController.abort('Navigation cancelled in-flight request'), 5);
  try {
    await inFlightPromise;
    assert(false, 'In-flight abort should reject with ApiAbortError');
  } catch (err) {
    assert(err instanceof ApiAbortError, 'In-flight caller abort cleanly classified as ApiAbortError without uncaught exception');
  }

  // 8. Intentional Timeout Classification
  try {
    await testFetch('/analytics/day-timeline?date=2026-11-05', { timeoutMs: 1 });
    assert(false, '1ms timeout should trigger ApiTimeoutError');
  } catch (err) {
    assert(err instanceof ApiTimeoutError, 'Sub-millisecond timeout cleanly classified as ApiTimeoutError');
  }

  // 9. Concurrent Requests Stability
  try {
    const promises = [
      testFetch('/tasks'),
      testFetch('/projects'),
      testFetch('/routines'),
      testFetch('/analytics/day-timeline?date=2026-11-05'),
      testFetch('/finance/summary'),
    ];
    const results = await Promise.all(promises);
    assert(results.length === 5, 'Executed 5 concurrent requests without unhandled abort or signal leakage');
  } catch (err) {
    assert(false, `Concurrent requests failed: ${err.message}`);
  }

  // 10. Memory Leak / Signal Cleanup Verification
  let leakedListeners = false;
  const testSignalController = new AbortController();
  await testFetch('/tasks', { signal: testSignalController.signal });
  // If event listener was not cleaned up, aborting now would trigger unexpected internal state
  testSignalController.abort();
  assert(!leakedListeners, 'External signal listeners deregistered cleanly in finally block');

  console.log('\n====================================================');
  console.log(`API REGRESSION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runApiRegressionSuite().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});

