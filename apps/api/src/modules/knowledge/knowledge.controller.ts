import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { KnowledgeService } from './knowledge.service';
import { NoteCategory } from '@prisma/client';
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

@Controller('knowledge')
@UseGuards(SupabaseAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('summary')
  async getSummary(@Req() req: any) {
    const userId = req.user.id;
    return this.knowledgeService.getKnowledgeSummary(userId);
  }

  // ==================== NOTES ====================
  @Get('notes')
  async getNotes(
    @Req() req: any,
    @Query('folderId') folderId?: string,
    @Query('category') category?: NoteCategory,
    @Query('isPinned') isPinned?: string,
    @Query('isBookmarked') isBookmarked?: string,
    @Query('isArchived') isArchived?: string,
    @Query('isJournal') isJournal?: string,
    @Query('journalDate') journalDate?: string,
    @Query('isTrash') isTrash?: string,
    @Query('search') search?: string,
    @Query('q') q?: string,
    @Query('tag') tag?: string,
  ) {
    const userId = req.user.id;
    return this.knowledgeService.getNotes(userId, {
      folderId,
      category,
      isPinned: isPinned !== undefined ? isPinned === 'true' : undefined,
      isBookmarked: isBookmarked !== undefined ? isBookmarked === 'true' : undefined,
      isArchived: isArchived !== undefined ? isArchived === 'true' : undefined,
      isJournal: isJournal !== undefined ? isJournal === 'true' : undefined,
      journalDate,
      isTrash: isTrash !== undefined ? isTrash === 'true' : undefined,
      search: search || q,
      tag,
    });
  }

  @Get('notes/:id')
  async getNoteById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.knowledgeService.getNoteById(userId, id);
  }

  @Post('notes')
  async createNote(@Req() req: any, @Body() dto: CreateNoteDto) {
    const userId = req.user.id;
    return this.knowledgeService.createNote(userId, dto);
  }

  @Patch('notes/:id')
  async updateNote(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateNoteDto) {
    const userId = req.user.id;
    return this.knowledgeService.updateNote(userId, id, dto);
  }

  @Delete('notes/:id')
  async deleteNote(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.knowledgeService.deleteNote(userId, id);
  }

  @Post('notes/:id/restore')
  async restoreNote(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.knowledgeService.restoreNote(userId, id);
  }

  @Delete('notes/:id/purge')
  async purgeNote(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.knowledgeService.purgeNote(userId, id);
  }

  @Post('notes/:id/rollback/:version')
  async rollbackNoteVersion(
    @Req() req: any,
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    const userId = req.user.id;
    return this.knowledgeService.rollbackNoteVersion(userId, id, version);
  }

  // ==================== FOLDERS ====================
  @Get('folders')
  async getFolders(@Req() req: any) {
    const userId = req.user.id;
    return this.knowledgeService.getFolders(userId);
  }

  @Post('folders')
  async createFolder(@Req() req: any, @Body() dto: CreateFolderDto) {
    const userId = req.user.id;
    return this.knowledgeService.createFolder(userId, dto);
  }

  @Patch('folders/:id')
  async updateFolder(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateFolderDto) {
    const userId = req.user.id;
    return this.knowledgeService.updateFolder(userId, id, dto);
  }

  @Delete('folders/:id')
  async deleteFolder(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.knowledgeService.deleteFolder(userId, id);
  }

  // ==================== BOOKMARKS ====================
  @Get('bookmarks')
  async getBookmarks(@Req() req: any, @Query('category') category?: string) {
    const userId = req.user.id;
    return this.knowledgeService.getBookmarks(userId, category);
  }

  @Post('bookmarks')
  async createBookmark(@Req() req: any, @Body() dto: CreateBookmarkDto) {
    const userId = req.user.id;
    return this.knowledgeService.createBookmark(userId, dto);
  }

  @Patch('bookmarks/:id')
  async updateBookmark(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateBookmarkDto) {
    const userId = req.user.id;
    return this.knowledgeService.updateBookmark(userId, id, dto);
  }

  @Delete('bookmarks/:id')
  async deleteBookmark(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.knowledgeService.deleteBookmark(userId, id);
  }

  // ==================== DOCUMENTS & ATTACHMENTS ====================
  @Get('documents')
  async getDocuments(@Req() req: any) {
    const userId = req.user.id;
    return this.knowledgeService.getDocuments(userId);
  }

  @Get('documents/:id')
  async getDocumentById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.knowledgeService.getDocumentById(userId, id);
  }

  @Post('documents')
  async createDocument(@Req() req: any, @Body() dto: CreateDocumentDto) {
    const userId = req.user.id;
    return this.knowledgeService.createDocument(userId, dto);
  }

  @Post('documents/:id/reindex')
  async reindexDocument(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.knowledgeService.reindexDocument(userId, id);
  }

  @Delete('documents/:id')
  async deleteDocument(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.knowledgeService.deleteDocument(userId, id);
  }

  // ==================== KNOWLEDGE GRAPH & RELATIONS ====================
  @Get('graph')
  async getKnowledgeGraph(@Req() req: any) {
    const userId = req.user.id;
    return this.knowledgeService.getKnowledgeGraph(userId);
  }

  @Post('relations')
  async createRelation(
    @Req() req: any,
    @Body() dto: { sourceNoteId: string; targetType: string; targetId: string; relationType: string },
  ) {
    const userId = req.user.id;
    return this.knowledgeService.createRelation(userId, dto);
  }

  // ==================== KNOWLEDGE INTELLIGENCE & AI TOOLS ====================
  @Get('search')
  async searchKnowledge(
    @Req() req: any,
    @Query('q') q: string,
    @Query('mode') mode?: 'keyword' | 'semantic' | 'hybrid',
    @Query('category') category?: NoteCategory,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.id;
    return this.knowledgeService.searchKnowledge(userId, {
      q: q || '',
      mode: mode || 'hybrid',
      category,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Post('ai/ask')
  async askKnowledge(@Req() req: any, @Body('question') question: string) {
    const userId = req.user.id;
    return this.knowledgeService.askKnowledge(userId, question);
  }

  @Post('ai/suggest-title')
  async suggestTitle(@Body() dto: SuggestTitleDto) {
    return this.knowledgeService.suggestTitle(dto.content);
  }

  @Post('ai/extract-topics')
  async extractTopics(@Body() dto: ExtractTopicsDto) {
    return this.knowledgeService.extractTopics(dto.content, dto.title);
  }

  @Post('ai/extract-actions')
  async extractActions(@Body() dto: ExtractActionsDto) {
    return this.knowledgeService.extractActionItems(dto.content, dto.noteId);
  }
}
