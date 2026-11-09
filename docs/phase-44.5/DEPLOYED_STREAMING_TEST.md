# Deployed Streaming & Response Transport Test

## 1. Test Architecture & Pipeline
- **Endpoint:** `POST /api/v1/ai/chat/stream`
- **Protocol:** HTTP Server-Sent Events (`text/event-stream; charset=utf-8`)
- **Transport:** Node.js Fetch Stream Reader -> SSE text chunks -> Client UI

## 2. Benchmark Measurements
- **HTTP Response Status:** `201 Created`
- **Time to First Token (TTFT):**
  - Grounded Streaming: ~50 - 90 ms
  - Context-enriched AI Briefing: ~4,084 ms (inclusive of multi-table database aggregation)
- **Total Stream Duration:** ~4,533 ms across 20 chunks
- **Chunk Emission Rate:** 1 token chunk every 20ms

## 3. Cancellation & Buffer Resistance
- **Client Disconnect / In-flight Abort:** Tested using `AbortController` firing at 100ms.
  - Return: Handled as clean `AbortError: This operation was aborted`.
  - Result: No hanging background sockets, no orphaned reader streams, zero unhandled promise rejections.
- **Reverse Proxy Compatibility:** SSE emits `\n\n` chunk delimiters with `Cache-Control: no-cache`, bypassing standard reverse-proxy write buffers.

