# PHASE 42 — API DOCUMENTATION
## Knowledge Intelligence Foundation Endpoints Contract

- **Base URL:** `/api/v1/knowledge`
- **Authentication:** Bearer JWT Header (`Authorization: Bearer <token>`)
- **Default Response Wrapper:** All responses return JSON conforming to standard envelope `{ statusCode: 200, data: T, message?: string }`.

---

## 1. Overview & Summary

### `GET /api/v1/knowledge/summary`
Retrieves aggregated statistics and recent records for the authenticated user.
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:**
```json
{
  "totalNotes": 14,
  "pinnedNotes": 4,
  "totalFolders": 3,
  "totalBookmarks": 5,
  "totalDocuments": 2,
  "tags": [
    { "name": "architecture", "count": 6 },
    { "name": "redis", "count": 4 }
  ],
  "recentNotes": [
    {
      "id": "c138f...",
      "title": "Distributed Transaction Architecture",
      "category": "NOTE",
      "isPinned": true,
      "updatedAt": "2026-11-04T10:14:00.000Z"
    }
  ]
}
```

---

## 2. Note Management

### `GET /api/v1/knowledge/notes`
Queries notes with multi-dimensional filtering.
- **Query Parameters:**
  - `folderId?: string`
  - `category?: NOTE | IDEA | RESOURCE | MEETING | JOURNAL`
  - `isPinned?: boolean`
  - `tag?: string`
  - `search?: string`
  - `isTrash?: boolean` (default: `false`)
  - `isJournal?: boolean`
  - `journalDate?: string` (format `YYYY-MM-DD`)
- **Response `200 OK`:** Array of `KnowledgeNote` objects with associated `folder`, `tags`, and `versions`.

### `GET /api/v1/knowledge/notes/:id`
Retrieves single note with complete revision history and tag associations.

### `POST /api/v1/knowledge/notes`
Creates a new knowledge note.
- **Body:**
```json
{
  "title": "BullMQ Distributed Workers",
  "content": "# Worker Architecture\n...",
  "category": "NOTE",
  "folderId": "optional-uuid",
  "tags": ["redis", "bullmq"],
  "isPinned": false,
  "isJournal": false,
  "journalDate": "2026-11-04"
}
```
- **Response `201 Created`**

### `PATCH /api/v1/knowledge/notes/:id`
Updates an existing note. Automatically takes an immutable snapshot into `KnowledgeVersion` before applying changes.
- **Body:** Partial `CreateKnowledgeNoteDto`.
- **Response `200 OK`**

### `DELETE /api/v1/knowledge/notes/:id`
Soft-deletes a note by setting `deletedAt = NOW()`.
- **Response `200 OK`:** `{ "success": true, "message": "Note moved to trash" }`

### `POST /api/v1/knowledge/notes/:id/restore`
Restores a soft-deleted note from trash (`deletedAt = null`).
- **Response `200 OK`:** `{ "success": true, "message": "Note restored from trash" }`

### `DELETE /api/v1/knowledge/notes/:id/purge`
Permanently purges a note and cascades deletion across its versions and relations.
- **Response `200 OK`:** `{ "success": true, "message": "Note permanently purged" }`

---

## 3. Version Control & Rollbacks

### `GET /api/v1/knowledge/notes/:id/versions`
Retrieves the complete historical revision timeline of a note.
- **Response `200 OK`:**
```json
[
  {
    "id": "v-uuid-1",
    "version": 1,
    "title": "Initial Draft",
    "content": "...",
    "createdAt": "2026-11-04T09:30:00.000Z"
  }
]
```

### `POST /api/v1/knowledge/notes/:id/rollback/:versionId`
Restores the note's title and content to the exact state captured in `:versionId`.
- **Response `200 OK`:** Updated `KnowledgeNote` object.

---

## 4. Document Hub & Semantic Chunking

### `GET /api/v1/knowledge/documents`
Lists indexed documents and file attachments.

### `POST /api/v1/knowledge/documents`
Uploads and registers a document for semantic chunking.
- **Body:**
```json
{
  "fileName": "system-architecture-spec.md",
  "fileSize": 14200,
  "mimeType": "text/markdown",
  "extractedText": "# Complete System Architecture\n..."
}
```
- **Response `201 Created`:** Indexes document and produces `KnowledgeChunk` records.

### `POST /api/v1/knowledge/documents/:id/reindex`
Re-processes full text, re-chunks content into overlapping windows, and refreshes vector representations.

### `DELETE /api/v1/knowledge/documents/:id`
Deletes document and cascades cleanup across all its semantic chunks.

---

## 5. Knowledge Graph

### `GET /api/v1/knowledge/graph`
Returns the topological graph representation for the knowledge base.
- **Response `200 OK`:**
```json
{
  "nodes": [
    { "id": "note-1", "label": "Architecture Spec", "type": "note", "category": "NOTE" },
    { "id": "proj-1", "label": "Platform Rebuild", "type": "project" }
  ],
  "edges": [
    { "id": "rel-1", "source": "note-1", "target": "proj-1", "type": "RELATES_TO" }
  ],
  "links": [ ... ]
}
```

### `POST /api/v1/knowledge/relations`
Creates a directional semantic relation edge between a source note and target entity.

---

## 6. AI Intelligence & Semantic Retrieval

### `POST /api/v1/knowledge/ai/suggest-title`
Generates a concise, context-aware title from raw text content.
- **Body:** `{ "content": "..." }`
- **Response `200 OK`:** `{ "title": "Database Isolation Guidelines" }`

### `POST /api/v1/knowledge/ai/extract-topics`
Extracts key topics and suggested tags from note text.
- **Body:** `{ "content": "...", "title": "Optional Title" }`
- **Response `200 OK`:** `{ "topics": ["security", "postgresql", "indexing"], "suggestedTags": [...] }`

### `POST /api/v1/knowledge/ai/extract-actions`
Identifies and structures actionable tasks embedded inside note text with priorities and estimated durations.
- **Body:** `{ "content": "...", "noteId": "optional-uuid" }`
- **Response `200 OK`:**
```json
{
  "actionItems": [
    { "title": "Benchmark commit latency", "priority": "HIGH", "estimatedMinutes": 45 },
    { "title": "Deploy worker replicas", "priority": "MEDIUM", "estimatedMinutes": 30 }
  ],
  "actions": ["Benchmark commit latency", "Deploy worker replicas"]
}
```

### `POST /api/v1/knowledge/search`
Performs hybrid search across notes, indexed documents, and semantic chunks.
- **Body:** `{ "q": "redis lock", "mode": "hybrid", "limit": 10 }`
- **Response `200 OK`:** Returns ranked matches with relevance scores and highlight snippets.

### `POST /api/v1/knowledge/ask`
Answers user questions grounded strictly in their personal knowledge base with citations.
- **Body:** `{ "question": "What is our strategy for Redis cluster mode?" }`
- **Response `200 OK`:**
```json
{
  "answer": "According to your notes on Distributed Architecture, high availability requires Redis cluster mode with BullMQ distributed locks.",
  "sources": [
    { "id": "note-123", "title": "Distributed Transaction Architecture", "type": "NOTE" }
  ]
}
```

