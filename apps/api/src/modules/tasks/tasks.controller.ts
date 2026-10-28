import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TasksService } from './tasks.service';
import { TaskCategory, TaskStatus } from '@assistant/shared';

@Controller('tasks')
@UseGuards(SupabaseAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('category') category?: TaskCategory,
    @Query('status') status?: TaskStatus,
    @Query('date') date?: string,
  ) {
    return this.tasksService.findAll(user.id, { category, status, date });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tasksService.findOne(user.id, id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.tasksService.create(user.id, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.tasksService.update(user.id, id, body);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tasksService.complete(user.id, id);
  }

  @Post(':id/snooze')
  @HttpCode(HttpStatus.OK)
  async snooze(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { minutes?: number; reason?: string },
  ) {
    return this.tasksService.snooze(user.id, id, body?.minutes, body?.reason);
  }

  @Post(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  async reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { scheduledStartTime: string; scheduledEndTime?: string },
  ) {
    return this.tasksService.reschedule(
      user.id,
      id,
      body.scheduledStartTime,
      body.scheduledEndTime,
    );
  }

  @Get(':id/events')
  async getEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tasksService.getEvents(user.id, id);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tasksService.remove(user.id, id);
  }
}
