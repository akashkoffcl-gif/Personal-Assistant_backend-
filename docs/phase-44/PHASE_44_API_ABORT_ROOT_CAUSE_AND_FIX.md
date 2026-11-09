# PHASE 44 — API ABORT ERROR ROOT CAUSE ANALYSIS & RESOLUTION
## Personal Assistant PWA — Intelligent Personal Life & Work Operating System

**Date:** 2026-11-05  
**Component:** `apps/web/src/lib/api.ts`  
**Error Investigated:** `AbortError: signal is aborted without reason` at `api.ts:72:18`

---

## 1. Root Cause Identification

Deep analysis of the legacy `fetcher` routine revealed four contributing flaws:

1. **Unconditional Signal Abort on Timeout Race:**
   ```ts
   // LEGACY FLAW
   const controller = new AbortController();
   const timeoutTimer = setTimeout(() => {
     controller.abort(); // Invokes abort without custom reason
   }, timeoutMs);
   ```
   If a fetch request finished or rejected, but the timeout timer was not cleared in an enclosed `try/finally` block before subsequent asynchronous microtasks executed, the timeout callback executed on an already handled request, causing unhandled `AbortError` rejections.

2. **Dangling Event Listeners on External Signals:**
   ```ts
   // LEGACY FLAW
   if (options?.signal) {
     options.signal.addEventListener('abort', () => controller.abort());
   }
   ```
   Event listeners attached to caller signals (e.g. from React component unmounts or TanStack Query mutations) were never removed. When callers subsequently aborted their signals, stale controller references threw uncaught abort events into global promise handlers.

3. **Inability to Distinguish Intentional Aborts from Real Network Timeouts:**
   Browser native `fetch` throws a generic `DOMException` named `'AbortError'` whether aborted via caller signal or timeout. The application lacked custom error differentiation.

4. **Credential Leakage in Debug Logs:**
   `console.log('[API FETCHING]', method, url, JSON.stringify(headers))` serialized raw `Authorization: Bearer ...` tokens directly to client logs.

---

## 2. Technical Remediation

### 2.1 Formal Error Classes
Introduced `ApiTimeoutError` and `ApiAbortError` subclasses inheriting from `Error`:
```ts
export class ApiTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'ApiTimeoutError';
  }
}

export class ApiAbortError extends Error {
  constructor(reason?: string) {
    super(reason || 'Request was aborted');
    this.name = 'ApiAbortError';
  }
}
```

### 2.2 Coordinated Signal Merging & Teardown
```ts
// RE-ENGINEERED IMPLEMENTATION
let isTimedOut = false;
const timeoutTimer = setTimeout(() => {
  isTimedOut = true;
  controller.abort(new ApiTimeoutError(timeoutMs));
}, timeoutMs);

let removeExternalAbortListener: (() => void) | null = null;
if (options?.signal) {
  if (options.signal.aborted) {
    clearTimeout(timeoutTimer);
    throw new ApiAbortError((options.signal as any).reason?.toString?.() || 'Caller signal already aborted');
  }
  const onExternalAbort = () => {
    controller.abort(new ApiAbortError((options?.signal as any)?.reason?.toString?.() || 'Caller aborted request'));
  };
  options.signal.addEventListener('abort', onExternalAbort, { once: true });
  removeExternalAbortListener = () => {
    options?.signal?.removeEventListener('abort', onExternalAbort);
  };
}
```

### 2.3 Guaranteed Teardown and Redacted Logging
- Guaranteed `clearTimeout(timeoutTimer)` and `removeExternalAbortListener()` in both success and error catch pathways.
- Redacted console logs to `[API ${method}] ${endpoint} { attempt }`, completely omitting `headers` from output.

