# PHASE 42 — EXISTING SCHEMA MAPPING & DATABASE EVOLUTION SPECIFICATION

**Project:** Personal Assistant PWA — Autonomous Personal Intelligence Expansion  
**Repository:** `D:\PT`  
**Date:** November 4, 2026  
**Status:** MAPPING VALIDATED & ZERO-DOWNTIME STRATEGY ESTABLISHED  
**Database:** Supabase PostgreSQL  

---

## 1. Existing Knowledge Schema Entities

```
+--------------------+        +---------------------+        +--------------------+
|  KnowledgeFolder   | 1    * |    KnowledgeNote    | *    * |    KnowledgeTag    |
|--------------------|<-------|---------------------|--------|--------------------|
| id (UUID, PK)      |        | id (UUID, PK)       |        | id (UUID, PK)      |
| userId (FK -> User)|        | userId (FK -> User) |        | userId (FK -> User)|
| name               |        | folderId (FK, opt)  |        | name (unique)      |
| color              |        | projectId (opt)     |        | createdAt          |
| icon               |        | title               |        +--------------------+
| parentId (FK, opt) |        | content (Text)      |                   |
| createdAt          |        | category (Enum)     |                   |
| updatedAt          |        | isBookmarked (Bool) |        +--------------------+
+--------------------+        | isArchived (Bool)   |        | KnowledgeTagOnNote |
                              | isPinned (Bool)     |        |--------------------|
                              | createdAt           |        | noteId (PK, FK)    |
                              | updatedAt           |        | tagId (PK, FK)     |
                              +---------------------+        +--------------------+
```

---

## 2. Proposed Non-Destructive Schema Extensions

To support Phase 42 (Knowledge Intelligence Foundation), the following models and fields will be added:

### 2.1. Enhancements to `KnowledgeNote`
- `deletedAt DateTime? @db.Timestamptz`: Enables soft delete and recovery from Trash.
- `summary String? @db.Text`: AI-generated executive summary.
- `isJournal Boolean @default(false)`: Identifies Daily Journal entries.
- `journalDate String?`: String date format (`YYYY-MM-DD`) for calendar journal lookup.

### 2.2. New Model: `KnowledgeVersion` (Revision History)
- `id String @id @default(uuid())`
- `noteId String`
- `title String`
- `content String @db.Text`
- `versionNumber Int`
- `changeSummary String?`
- `createdAt DateTime @default(now()) @db.Timestamptz`

### 2.3. New Model: `KnowledgeDocument` (Document Processing & Attachments)
- `id String @id @default(uuid())`
- `userId String`
- `fileName String`
- `fileSize Int`
- `mimeType String`
- `storagePath String`
- `extractedText String? @db.Text`
- `status DocumentIndexStatus @default(PENDING)` (`PENDING`, `PROCESSING`, `INDEXED`, `FAILED`)
- `chunkCount Int @default(0)`
- `errorMessage String?`
- `noteId String?` (optional link to note)
- `createdAt DateTime @default(now()) @db.Timestamptz`
- `updatedAt DateTime @updatedAt @db.Timestamptz`

### 2.4. New Model: `KnowledgeChunk` (Search Chunks & Vectors)
- `id String @id @default(uuid())`
- `userId String`
- `noteId String?`
- `documentId String?`
- `chunkIndex Int`
- `content String @db.Text`
- `tokenCount Int?`
- `embedding Json?` (stores normalized vector float array for semantic cosine search)
- `createdAt DateTime @default(now()) @db.Timestamptz`

### 2.5. New Model: `KnowledgeRelation` (Knowledge Graph Links)
- `id String @id @default(uuid())`
- `userId String`
- `sourceNoteId String`
- `targetType String` (`NOTE`, `TASK`, `PROJECT`, `GOAL`)
- `targetId String`
- `relationType String` (`RELATED_NOTE`, `MENTIONS_TASK`, `LINKED_PROJECT`, `SUPPORTS_GOAL`)
- `confidence Float @default(1.0)`
- `createdAt DateTime @default(now()) @db.Timestamptz`

---

## 3. Migration Safety & Production Data Preservation

- **Rule 1:** NEVER execute `prisma migrate reset` on production.
- **Rule 2:** All new fields on existing models are either optional (`?`) or carry safe defaults (`@default(...)`).
- **Rule 3:** The existing `knowledge_notes`, `knowledge_folders`, and `bookmarks` tables remain 100% operational with backward-compatible queries.
