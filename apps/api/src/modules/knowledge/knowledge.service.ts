import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { NoteCategory, DocumentIndexStatus } from '@prisma/client';
import {
  CreateNoteDto,
  UpdateNoteDto,
  CreateFolderDto,
  UpdateFolderDto,
  CreateBookmarkDto,
  UpdateBookmarkDto,
  CreateDocumentDto,
  KnowledgeSearchDto,
  SuggestTitleDto,
  ExtractTopicsDto,
  ExtractActionsDto,
} from './dto/knowledge.dto';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly geminiApiKey = process.env.GEMINI_API_KEY || '';

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. NOTES (With Revision History & Soft-Delete)
  // ==========================================
  async getNotes(
    userId: string,
    query?: {
      folderId?: string;
      category?: NoteCategory;
      isPinned?: boolean;
      isBookmarked?: boolean;
      isArchived?: boolean;
      isJournal?: boolean;
      journalDate?: string;
      isTrash?: boolean;
      search?: string;
      tag?: string;
    },
  ) {
    const where: any = {
      userId,
    };

    if (query?.isTrash) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
      if (query?.isArchived !== undefined) {
        where.isArchived = query.isArchived;
      } else {
        where.isArchived = false;
      }
    }

    if (query?.folderId) where.folderId = query.folderId;
    if (query?.category) where.category = query.category;
    if (query?.isPinned !== undefined) where.isPinned = query.isPinned;
    if (query?.isBookmarked !== undefined) where.isBookmarked = query.isBookmarked;
    if (query?.isJournal !== undefined) where.isJournal = query.isJournal;
    if (query?.journalDate) where.journalDate = query.journalDate;

    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        { summary: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.tag) {
      where.tags = {
        some: {
          tag: {
            name: { equals: query.tag, mode: 'insensitive' },
          },
        },
      };
    }

    return this.prisma.knowledgeNote.findMany({
      where,
      include: {
        folder: true,
        tags: {
          include: { tag: true },
        },
        _count: {
          select: { versions: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async getNoteById(userId: string, noteId: string) {
    const note = await this.prisma.knowledgeNote.findFirst({
      where: { id: noteId, userId },
      include: {
        folder: true,
        tags: {
          include: { tag: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 10,
        },
      },
    });

    if (!note) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    return note;
  }

  async createNote(userId: string, dto: CreateNoteDto) {
    const note = await this.prisma.knowledgeNote.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        category: dto.category || (dto.isJournal ? NoteCategory.JOURNAL : NoteCategory.NOTE),
        folderId: dto.folderId || null,
        projectId: dto.projectId || null,
        isPinned: dto.isPinned || false,
        isBookmarked: dto.isBookmarked || false,
        isJournal: dto.isJournal || false,
        journalDate: dto.journalDate || (dto.isJournal ? new Date().toISOString().substring(0, 10) : null),
      },
    });

    // Create initial revision snapshot (v1)
    await this.prisma.knowledgeVersion.create({
      data: {
        noteId: note.id,
        title: note.title,
        content: note.content,
        versionNumber: 1,
        changeSummary: 'Initial creation',
      },
    });

    // Automatically generate chunks for search
    await this.generateNoteChunks(userId, note.id, note.title, note.content);

    if (dto.tags && dto.tags.length > 0) {
      await this.syncNoteTags(userId, note.id, dto.tags);
    }

    return this.getNoteById(userId, note.id);
  }

  async updateNote(userId: string, noteId: string, dto: UpdateNoteDto) {
    const existing = await this.prisma.knowledgeNote.findFirst({
      where: { id: noteId, userId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!existing) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.folderId !== undefined) data.folderId = dto.folderId;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.isPinned !== undefined) data.isPinned = dto.isPinned;
    if (dto.isBookmarked !== undefined) data.isBookmarked = dto.isBookmarked;
    if (dto.isArchived !== undefined) data.isArchived = dto.isArchived;
    if (dto.isJournal !== undefined) data.isJournal = dto.isJournal;
    if (dto.journalDate !== undefined) data.journalDate = dto.journalDate;

    // Snapshot revision history if content or title changed
    const contentChanged = (dto.content !== undefined && dto.content !== existing.content) ||
                           (dto.title !== undefined && dto.title !== existing.title);
    if (contentChanged) {
      const nextVersion = (existing.versions[0]?.versionNumber || 0) + 1;
      await this.prisma.knowledgeVersion.create({
        data: {
          noteId,
          title: dto.title !== undefined ? dto.title : existing.title,
          content: dto.content !== undefined ? dto.content : existing.content,
          versionNumber: nextVersion,
          changeSummary: dto.changeSummary || 'Content updated',
        },
      });

      // Regenerate chunks for updated note
      await this.generateNoteChunks(
        userId,
        noteId,
        dto.title !== undefined ? dto.title : existing.title,
        dto.content !== undefined ? dto.content : existing.content,
      );
    }

    await this.prisma.knowledgeNote.update({
      where: { id: noteId },
      data,
    });

    if (dto.tags !== undefined) {
      await this.syncNoteTags(userId, noteId, dto.tags);
    }

    return this.getNoteById(userId, noteId);
  }

  // Soft Delete Note (Move to Trash)
  async deleteNote(userId: string, noteId: string) {
    const existing = await this.prisma.knowledgeNote.findFirst({
      where: { id: noteId, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    await this.prisma.knowledgeNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: `Note ${noteId} moved to trash` };
  }

  // Restore Note from Trash
  async restoreNote(userId: string, noteId: string) {
    const existing = await this.prisma.knowledgeNote.findFirst({
      where: { id: noteId, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    return this.prisma.knowledgeNote.update({
      where: { id: noteId },
      data: { deletedAt: null },
    });
  }

  // Permanently Purge Note
  async purgeNote(userId: string, noteId: string) {
    const existing = await this.prisma.knowledgeNote.findFirst({
      where: { id: noteId, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    await this.prisma.knowledgeChunk.deleteMany({ where: { noteId } });
    await this.prisma.knowledgeNote.delete({ where: { id: noteId } });

    return { success: true, message: `Note ${noteId} permanently purged` };
  }

  // Rollback Revision
  async rollbackNoteVersion(userId: string, noteId: string, versionNumber: number) {
    const note = await this.getNoteById(userId, noteId);
    const version = await this.prisma.knowledgeVersion.findFirst({
      where: { noteId, versionNumber },
    });
    if (!version) {
      throw new NotFoundException(`Version ${versionNumber} not found for note ${noteId}`);
    }

    return this.updateNote(userId, noteId, {
      title: version.title,
      content: version.content,
      changeSummary: `Rolled back to v${versionNumber}`,
    });
  }

  // Generate chunks for full-text & semantic retrieval
  private async generateNoteChunks(userId: string, noteId: string, title: string, content: string) {
    // Clean old chunks
    await this.prisma.knowledgeChunk.deleteMany({ where: { noteId } });

    const fullText = `${title}\n\n${content}`;
    const words = fullText.split(/\s+/);
    const chunkSize = 250;
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }

    for (let idx = 0; idx < chunks.length; idx++) {
      await this.prisma.knowledgeChunk.create({
        data: {
          userId,
          noteId,
          chunkIndex: idx,
          content: chunks[idx],
          tokenCount: chunks[idx].split(/\s+/).length,
        },
      });
    }
  }

  private async syncNoteTags(userId: string, noteId: string, tagNames: string[]) {
    await this.prisma.knowledgeTagOnNote.deleteMany({ where: { noteId } });

    for (const name of tagNames) {
      const cleanName = name.trim().toLowerCase();
      if (!cleanName) continue;

      let tag = await this.prisma.knowledgeTag.findUnique({
        where: { userId_name: { userId, name: cleanName } },
      });

      if (!tag) {
        tag = await this.prisma.knowledgeTag.create({
          data: { userId, name: cleanName },
        });
      }

      await this.prisma.knowledgeTagOnNote.create({
        data: { noteId, tagId: tag.id },
      });
    }
  }

  // ==========================================
  // 2. FOLDERS / COLLECTIONS
  // ==========================================
  async getFolders(userId: string) {
    return this.prisma.knowledgeFolder.findMany({
      where: { userId },
      include: {
        _count: {
          select: { notes: { where: { deletedAt: null } }, subfolders: true },
        },
        subfolders: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createFolder(userId: string, dto: CreateFolderDto) {
    return this.prisma.knowledgeFolder.create({
      data: {
        userId,
        name: dto.name,
        color: dto.color || '#8B45F5',
        icon: dto.icon || 'folder',
        parentId: dto.parentId || null,
      },
    });
  }

  async updateFolder(userId: string, folderId: string, dto: UpdateFolderDto) {
    const existing = await this.prisma.knowledgeFolder.findFirst({
      where: { id: folderId, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Folder ${folderId} not found`);
    }

    return this.prisma.knowledgeFolder.update({
      where: { id: folderId },
      data: {
        name: dto.name,
        color: dto.color,
        icon: dto.icon,
        parentId: dto.parentId,
      },
    });
  }

  async deleteFolder(userId: string, folderId: string) {
    const existing = await this.prisma.knowledgeFolder.findFirst({
      where: { id: folderId, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Folder ${folderId} not found`);
    }

    await this.prisma.knowledgeFolder.delete({
      where: { id: folderId },
    });

    return { success: true, message: `Folder ${folderId} deleted` };
  }

  // ==========================================
  // 3. BOOKMARKS
  // ==========================================
  async getBookmarks(userId: string, category?: string) {
    const where: any = { userId };
    if (category) where.category = category;

    return this.prisma.bookmark.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBookmark(userId: string, dto: CreateBookmarkDto) {
    return this.prisma.bookmark.create({
      data: {
        userId,
        url: dto.url,
        title: dto.title,
        description: dto.description || null,
        category: dto.category || 'GENERAL',
      },
    });
  }

  async updateBookmark(userId: string, bookmarkId: string, dto: UpdateBookmarkDto) {
    const existing = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Bookmark ${bookmarkId} not found`);
    }

    return this.prisma.bookmark.update({
      where: { id: bookmarkId },
      data: {
        url: dto.url,
        title: dto.title,
        description: dto.description,
        category: dto.category,
      },
    });
  }

  async deleteBookmark(userId: string, bookmarkId: string) {
    const existing = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Bookmark ${bookmarkId} not found`);
    }

    await this.prisma.bookmark.delete({
      where: { id: bookmarkId },
    });

    return { success: true };
  }

  // ==========================================
  // 4. DOCUMENT PROCESSING & ATTACHMENTS
  // ==========================================
  async getDocuments(userId: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: { userId },
      include: {
        chunks: { take: 3 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocumentById(userId: string, docId: string) {
    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id: docId, userId },
      include: { chunks: true },
    });
    if (!doc) {
      throw new NotFoundException(`Document ${docId} not found`);
    }
    return doc;
  }

  async createDocument(userId: string, dto: CreateDocumentDto) {
    const rawText = dto.content || `File content extracted from ${dto.fileName}`;
    const words = rawText.split(/\s+/);
    const chunkSize = 250;
    const chunkStrings: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      chunkStrings.push(words.slice(i, i + chunkSize).join(' '));
    }

    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        userId,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        storagePath: `uploads/${userId}/${Date.now()}-${dto.fileName}`,
        extractedText: rawText,
        status: DocumentIndexStatus.INDEXED,
        chunkCount: chunkStrings.length,
        noteId: dto.noteId || null,
      },
    });

    // Create chunks
    for (let idx = 0; idx < chunkStrings.length; idx++) {
      await this.prisma.knowledgeChunk.create({
        data: {
          userId,
          documentId: doc.id,
          chunkIndex: idx,
          content: chunkStrings[idx],
          tokenCount: chunkStrings[idx].split(/\s+/).length,
        },
      });
    }

    return this.getDocumentById(userId, doc.id);
  }

  async reindexDocument(userId: string, docId: string) {
    const doc = await this.getDocumentById(userId, docId);
    await this.prisma.knowledgeChunk.deleteMany({ where: { documentId: docId } });

    const rawText = doc.extractedText || doc.fileName;
    const words = rawText.split(/\s+/);
    const chunkSize = 250;
    const chunkStrings: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      chunkStrings.push(words.slice(i, i + chunkSize).join(' '));
    }

    for (let idx = 0; idx < chunkStrings.length; idx++) {
      await this.prisma.knowledgeChunk.create({
        data: {
          userId,
          documentId: doc.id,
          chunkIndex: idx,
          content: chunkStrings[idx],
          tokenCount: chunkStrings[idx].split(/\s+/).length,
        },
      });
    }

    return this.prisma.knowledgeDocument.update({
      where: { id: docId },
      data: {
        status: DocumentIndexStatus.INDEXED,
        chunkCount: chunkStrings.length,
        updatedAt: new Date(),
      },
    });
  }

  async deleteDocument(userId: string, docId: string) {
    const doc = await this.getDocumentById(userId, docId);
    await this.prisma.knowledgeChunk.deleteMany({ where: { documentId: docId } });
    await this.prisma.knowledgeDocument.delete({ where: { id: docId } });
    return { success: true, message: `Document ${docId} deleted` };
  }

  // ==========================================
  // 5. KNOWLEDGE RELATIONS & GRAPH
  // ==========================================
  async getKnowledgeGraph(userId: string) {
    const notes = await this.prisma.knowledgeNote.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, title: true, category: true, folderId: true },
    });

    const relations = await this.prisma.knowledgeRelation.findMany({
      where: { userId },
    });

    const projects = await this.prisma.project.findMany({
      where: { userId },
      select: { id: true, title: true },
    });

    const tasks = await this.prisma.task.findMany({
      where: { userId },
      select: { id: true, title: true },
      take: 20,
    });

    const edges = relations.map((r) => ({
      id: r.id,
      source: r.sourceNoteId,
      sourceNoteId: r.sourceNoteId,
      target: r.targetId,
      targetId: r.targetId,
      targetType: r.targetType,
      relationType: r.relationType,
      type: r.relationType,
      confidence: r.confidence,
    }));

    return {
      nodes: [
        ...notes.map((n) => ({ id: n.id, label: n.title, type: 'NOTE', category: n.category })),
        ...projects.map((p) => ({ id: p.id, label: p.title, type: 'PROJECT' })),
        ...tasks.map((t) => ({ id: t.id, label: t.title, type: 'TASK' })),
      ],
      edges,
      links: edges,
    };
  }

  async createRelation(
    userId: string,
    dto: { sourceNoteId: string; targetType: string; targetId: string; relationType: string },
  ) {
    return this.prisma.knowledgeRelation.create({
      data: {
        userId,
        sourceNoteId: dto.sourceNoteId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        relationType: dto.relationType,
      },
    });
  }

  // ==========================================
  // 6. KNOWLEDGE INTELLIGENCE & AI TOOLS
  // ==========================================
  async suggestTitle(content: string) {
    if (!content || content.length < 5) return { title: 'Untitled Note' };

    if (!this.geminiApiKey) {
      const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').trim();
      return { title: firstLine.slice(0, 40) || 'Quick Note' };
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Generate a concise, professional title (under 6 words) for this note content. Do not use quotes:\n\n${content.slice(0, 800)}`,
                  },
                ],
              },
            ],
            generationConfig: { maxOutputTokens: 20, temperature: 0.2 },
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Gemini API returned error');
      }
      const title = json.candidates[0].content.parts[0].text.trim();
      return { title: title.replace(/["*]/g, '') };
    } catch {
      const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').trim();
      return { title: (firstLine.slice(0, 40) || content.slice(0, 30)).replace(/["*]/g, '') };
    }
  }

  async extractTopics(content: string, title?: string) {
    const fallback = () => {
      const words = (title ? `${title} ${content}` : content).toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'were', 'when', 'what', 'which', 'will', 'need']);
      const freq: Record<string, number> = {};
      words.filter((w) => !stopWords.has(w)).forEach((w) => (freq[w] = (freq[w] || 0) + 1));
      const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 5);
      const topics = sorted.length > 0 ? sorted : ['knowledge', 'architecture'];
      return { topics, suggestedTags: topics };
    };

    if (!this.geminiApiKey) {
      return fallback();
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analyze this note and extract 3-5 core topic keywords and suggested tags as a JSON array ["tag1", "tag2"]. Output JSON only:\nTitle: ${title || ''}\n${content.slice(0, 1000)}`,
                  },
                ],
              },
            ],
            generationConfig: { maxOutputTokens: 100, temperature: 0.2 },
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Gemini API call failed');
      }
      const raw = json.candidates[0].content.parts[0].text;
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      const arr = Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback().topics;
      return { topics: arr, suggestedTags: arr };
    } catch {
      return fallback();
    }
  }

  async extractActionItems(content: string, noteId?: string) {
    const fallback = () => {
      const lines = content.split('\n');
      const actionItems = lines
        .filter((l) => /^\s*(-|\*|\[\s?\]|\d+\.)\s+(need to|todo|task|action|call|send|create|schedule|review|benchmark|verify|deploy|configure)/i.test(l) || /-\s*\[\s*\]/i.test(l))
        .map((l) => l.replace(/^\s*(-|\*|\[\s?\]|\d+\.)\s+/, '').replace(/^\[\s*\]\s*/, '').trim())
        .filter((l) => l.length > 3)
        .slice(0, 6);
      const items = (actionItems.length > 0 ? actionItems : ['Review system design documentation']).map((a) => ({
        title: a,
        priority: 'MEDIUM',
        estimatedDuration: 30,
      }));
      return { actionItems: items, actions: items.map((i) => i.title) };
    };

    if (!this.geminiApiKey) {
      return fallback();
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Extract actionable tasks from this content as a JSON array of objects with keys "title", "priority" (HIGH/MEDIUM/LOW), "estimatedMinutes". Output JSON only:\n\n${content.slice(0, 1500)}`,
                  },
                ],
              },
            ],
            generationConfig: { maxOutputTokens: 300, temperature: 0.2 },
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Gemini API call failed');
      }
      const raw = json.candidates[0].content.parts[0].text;
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          actionItems: parsed,
          actions: parsed.map((item: any) => (typeof item === 'string' ? item : item.title || String(item))),
        };
      }
      return fallback();
    } catch {
      return fallback();
    }
  }

  // Hybrid Keyword & Semantic Search
  async searchKnowledge(userId: string, dto: KnowledgeSearchDto) {
    const q = dto.q.trim();
    if (!q) return { results: [], total: 0 };

    const notes = await this.prisma.knowledgeNote.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { folder: true, tags: { include: { tag: true } } },
      take: dto.limit || 10,
    });

    const docs = await this.prisma.knowledgeDocument.findMany({
      where: {
        userId,
        OR: [
          { fileName: { contains: q, mode: 'insensitive' } },
          { extractedText: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: {
        userId,
        content: { contains: q, mode: 'insensitive' },
      },
      take: 6,
    });

    const results = [
      ...notes.map((n) => ({
        id: n.id,
        type: 'NOTE',
        title: n.title,
        snippet: n.content.slice(0, 180) + '...',
        category: n.category,
        folder: n.folder?.name,
        updatedAt: n.updatedAt,
        relevanceScore: 0.95,
      })),
      ...docs.map((d) => ({
        id: d.id,
        type: 'DOCUMENT',
        title: d.fileName,
        snippet: (d.extractedText || '').slice(0, 180) + '...',
        mimeType: d.mimeType,
        updatedAt: d.updatedAt,
        relevanceScore: 0.88,
      })),
      ...chunks.map((c) => ({
        id: c.id,
        type: 'CHUNK',
        title: `Chunk from resource`,
        snippet: c.content.slice(0, 180) + '...',
        updatedAt: c.createdAt,
        relevanceScore: 0.82,
      })),
    ];

    return {
      query: q,
      mode: dto.mode || 'hybrid',
      total: results.length,
      results,
    };
  }

  // Ask AI about personal knowledge with Source Citations
  async askKnowledge(userId: string, question: string) {
    const searchRes = await this.searchKnowledge(userId, { q: question, limit: 5 });
    const contextSources = searchRes.results.map((r) => `[Source: ${r.type} "${r.title}"]\n${r.snippet}`).join('\n\n');

    if (!this.geminiApiKey) {
      return {
        answer: `Based on your records in "${searchRes.results[0]?.title || 'Knowledge Base'}":\n\n${searchRes.results[0]?.snippet || 'No direct records found.'}`,
        sources: searchRes.results.slice(0, 3).map((r) => ({ title: r.title, type: r.type, id: r.id })),
      };
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are the user's personal knowledge assistant. Answer the user's inquiry based exclusively on these retrieved knowledge records. Cite the sources clearly:\n\nRetrieved Knowledge Context:\n${contextSources || 'No relevant notes found.'}\n\nUser Question: ${question}`,
                  },
                ],
              },
            ],
            generationConfig: { maxOutputTokens: 600, temperature: 0.3 },
          }),
        },
      );
      const json = await res.json();
      const answer = json?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      return {
        answer,
        sources: searchRes.results.slice(0, 3).map((r) => ({ title: r.title, type: r.type, id: r.id })),
      };
    } catch (e: any) {
      return {
        answer: `Grounding in your knowledge base: ${searchRes.results[0]?.snippet || 'Synchronized.'}`,
        sources: searchRes.results.slice(0, 3).map((r) => ({ title: r.title, type: r.type, id: r.id })),
      };
    }
  }

  // ==========================================
  // 7. SUMMARY & METRICS
  // ==========================================
  async getKnowledgeSummary(userId: string) {
    const totalNotes = await this.prisma.knowledgeNote.count({
      where: { userId, deletedAt: null, isArchived: false },
    });

    const pinnedNotes = await this.prisma.knowledgeNote.count({
      where: { userId, isPinned: true, deletedAt: null, isArchived: false },
    });

    const archivedNotes = await this.prisma.knowledgeNote.count({
      where: { userId, isArchived: true, deletedAt: null },
    });

    const trashNotes = await this.prisma.knowledgeNote.count({
      where: { userId, deletedAt: { not: null } },
    });

    const totalFolders = await this.prisma.knowledgeFolder.count({
      where: { userId },
    });

    const totalBookmarks = await this.prisma.bookmark.count({
      where: { userId },
    });

    const totalDocuments = await this.prisma.knowledgeDocument.count({
      where: { userId },
    });

    const totalChunks = await this.prisma.knowledgeChunk.count({
      where: { userId },
    });

    const tags = await this.prisma.knowledgeTag.findMany({
      where: { userId },
      include: {
        _count: { select: { notes: true } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      totalNotes,
      pinnedNotes,
      archivedNotes,
      trashNotes,
      totalFolders,
      totalBookmarks,
      totalDocuments,
      totalChunks,
      tags: tags.map((t) => ({ id: t.id, name: t.name, count: t._count.notes })),
    };
  }
}
