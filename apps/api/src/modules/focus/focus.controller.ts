import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FocusService } from './focus.service';
import {
  StartFocusSessionDto,
  UpdateFocusPreferencesDto,
} from './dto/focus.dto';

@Controller('focus')
@UseGuards(SupabaseAuthGuard)
export class FocusController {
  constructor(private readonly focusService: FocusService) {}

  @Get('preferences')
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.focusService.getPreferences(user.id);
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFocusPreferencesDto,
  ) {
    return this.focusService.updatePreferences(user.id, dto);
  }

  @Get('current')
  async getCurrentSession(@CurrentUser() user: AuthenticatedUser) {
    return this.focusService.getCurrentSession(user.id);
  }

  @Post('start')
  async startSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartFocusSessionDto,
  ) {
    return this.focusService.startSession(user.id, dto);
  }

  @Post(':id/pause')
  async pauseSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.focusService.pauseSession(user.id, id);
  }

  @Post(':id/resume')
  async resumeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.focusService.resumeSession(user.id, id);
  }

  @Post(':id/complete')
  async completeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.focusService.completeSession(user.id, id, notes);
  }

  @Post(':id/abandon')
  async abandonSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.focusService.abandonSession(user.id, id);
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.focusService.getHistory(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('analytics')
  async getAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.focusService.getAnalytics(user.id);
  }
}

