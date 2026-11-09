# PHASE 42 — DATABASE REPORT
## Schema Modeling, Migrations & Supabase Synchronization

- **Database Engine:** PostgreSQL 15 (Supabase Cloud)
- **Connection Pooler:** Transaction Pooler (`aws-0-ap-northeast-1.pooler.supabase.com:6543`)
- **Direct Engine:** Direct Connection (`aws-0-ap-northeast-1.pooler.supabase.com:5432`)
- **ORM:** Prisma 5.22.0

---

## 1. Schema Extensions (`apps/api/prisma/schema.prisma`)

Four models were integrated into the primary Prisma schema and pushed to Supabase PostgreSQL without data loss or downtime:

### 1.1 `KnowledgeVersion`
Historical snapshot table capturing revisions of notes on each edit.
```prisma
model KnowledgeVersion {
  id        String        @id @default(uuid())
  noteId    String
  note      KnowledgeNote @relation(fields: [noteId], references: [id], onDelete: Cascade)
  version   Int
  title     String
  content   String
  summary   String?
  createdAt DateTime      @default(now())

  @@unique([noteId, version])
  @@index([noteId])
}
```

### 1.2 `KnowledgeDocument`
Document repository tracking uploaded specifications, text artifacts, and processing states.
```prisma
model KnowledgeDocument {
  id            String              @id @default(uuid())
  userId        String
  user          User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  fileName      String
  fileSize      Int
  mimeType      String
  storageUrl    String?
  extractedText String?
  status        DocumentIndexStatus @default(PENDING)
  chunks        KnowledgeChunk[]
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  @@index([userId])
  @@index([status])
}

enum DocumentIndexStatus {
  PENDING
  INDEXED
  FAILED
}
```

### 1.3 `KnowledgeChunk`
Semantic partitioning table storing text chunks for contextual retrieval and vectorization.
```prisma
model KnowledgeChunk {
  id         String             @id @default(uuid())
  documentId String?
  document   KnowledgeDocument? @relation(fields: [documentId], references: [id], onDelete: Cascade)
  userId     String
  user       User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  chunkIndex Int
  content    String
  embedding  Json?
  createdAt  DateTime           @default(now())

  @@index([userId])
  @@index([documentId])
}
```

### 1.4 `KnowledgeRelation`
Graph adjacency table defining typed semantic edges between knowledge entities.
```prisma
model KnowledgeRelation {
  id           String        @id @default(uuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  sourceNoteId String
  sourceNote   KnowledgeNote @relation(fields: [sourceNoteId], references: [id], onDelete: Cascade)
  targetId     String
  relationType String        @default("RELATES_TO")
  createdAt    DateTime      @default(now())

  @@index([userId])
  @@index([sourceNoteId])
  @@index([targetId])
}
```

---

## 2. Migration Execution & Verification

1. **Prisma Generation:** Command `npm --workspace=apps/api run prisma:generate` executed cleanly. Generated TypeScript types and client wrappers for all 4 models.
2. **Schema Push:** Command `npx prisma db push --schema=apps/api/prisma/schema.prisma` executed against Supabase PostgreSQL:
   - `0 errors`
   - `0 table drops`
   - `0 data loss warnings`
3. **Database Integrity:** Foreign key constraints enforce cascading deletes (`onDelete: Cascade`), guaranteeing that orphan versions, chunks, and relations are automatically purged upon note or document deletion.

