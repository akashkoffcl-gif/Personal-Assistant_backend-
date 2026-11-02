import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RoutinesService } from './routines.service';
import { TaskStatus } from '@assistant/shared';

@Controller('routines')
@UseGuards(SupabaseAuthGuard)
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.routinesService.findAll(user.id);
  }

  @Get('occurrences/:date')
  async getOccurrences(
    @CurrentUser() user: AuthenticatedUser,
    @Param('date') date: string,
  ) {
    return this.routinesService.getOccurrencesForDate(user.id, date);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.routinesService.findOne(user.id, id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.routinesService.create(user.id, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.routinesService.update(user.id, id, body);
  }

  @Post('occurrences/:id/record')
  @HttpCode(HttpStatus.OK)
  async recordOccurrence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') occurrenceId: string,
    @Body() body: { status: TaskStatus; actualQuantity?: number; notes?: string },
  ) {
    return this.routinesService.recordOccurrence(user.id, occurrenceId, body);
  }

  @Post('occurrences/:id/complete')
  @HttpCode(HttpStatus.OK)
  async completeOccurrence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') occurrenceId: string,
    @Body() body?: { actualQuantity?: number; notes?: string },
  ) {
    return this.routinesService.recordOccurrence(user.id, occurrenceId, {
      status: TaskStatus.COMPLETED,
      actualQuantity: body?.actualQuantity ?? 1,
      notes: body?.notes,
    });
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.routinesService.remove(user.id, id);
  }
}

