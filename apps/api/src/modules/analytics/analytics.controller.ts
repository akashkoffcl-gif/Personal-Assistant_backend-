import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(SupabaseAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('daily')
  async getDailyKpi(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.analyticsService.getDailyKpi(user.id, targetDate);
  }

  @Get('trends')
  async getTrends(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getTrends(user.id, days ? Number(days) : 7);
  }
}
