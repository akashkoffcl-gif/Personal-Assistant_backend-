import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUrl,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { NoteCategory } from '@prisma/client';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(NoteCategory)
  @IsOptional()
  category?: NoteCategory;

  @IsUUID()
  @IsOptional()
  folderId?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsBoolean()
  @IsOptional()
  isBookmarked?: boolean;

  @IsBoolean()
  @IsOptional()
  isJournal?: boolean;

  @IsString()
  @IsOptional()
  journalDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateNoteDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(NoteCategory)
  @IsOptional()
  category?: NoteCategory;

  @IsUUID()
  @IsOptional()
  folderId?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsBoolean()
  @IsOptional()
  isBookmarked?: boolean;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @IsBoolean()
  @IsOptional()
  isJournal?: boolean;

  @IsString()
  @IsOptional()
  journalDate?: string;

  @IsString()
  @IsOptional()
  changeSummary?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}

export class UpdateFolderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}

export class CreateBookmarkDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateBookmarkDto {
  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsNumber()
  @Min(1)
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsUUID()
  @IsOptional()
  noteId?: string;
}

export class KnowledgeSearchDto {
  @IsString()
  @IsNotEmpty()
  q: string;

  @IsString()
  @IsOptional()
  mode?: 'keyword' | 'semantic' | 'hybrid';

  @IsEnum(NoteCategory)
  @IsOptional()
  category?: NoteCategory;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class SuggestTitleDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ExtractTopicsDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  title?: string;
}

export class ExtractActionsDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  @IsOptional()
  noteId?: string;
}
