import { Controller, Get, Post, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WellnessService } from './wellness.service';

@Controller('wellness')
@UseGuards(SupabaseAuthGuard)
export class WellnessController {
  constructor(private readonly wellnessService: WellnessService) {}

  @Post('metrics')
  async logMetric(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.wellnessService.logMetric(user.id, body);
  }

  @Post('check-in')
  async recordCheckIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.wellnessService.recordCheckIn(user.id, body);
  }

  @Get('summary')
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.wellnessService.getDailySummary(user.id, targetDate);
  }

  @Delete('records')
  async clearRecords(@CurrentUser() user: AuthenticatedUser) {
    return this.wellnessService.clearUserWellnessData(user.id);
  }
}
