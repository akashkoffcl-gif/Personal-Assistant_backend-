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

  @Get('command-center')
  async getCommandCenter(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
    @Query('range') range?: number,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const rangeDays = range ? Number(range) : 7;
    return this.analyticsService.getCommandCenterData(user.id, targetDate, rangeDays);
  }

  @Get('predictive')
  async getPredictiveAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getPredictiveAnalytics(user.id);
  }

  @Get('life-balance')
  async getLifeBalance(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getLifeBalance(user.id);
  }

  @Get('timeline')
  async getUnifiedTimeline(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getUnifiedTimeline(user.id, limit ? Number(limit) : 50);
  }

  // ==========================================
  // PHASE 43.2: INTELLIGENT DAILY TIMELINE
  // ==========================================
  @Get('day-timeline')
  async getDayTimeline(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.analyticsService.getDayTimelineData(user.id, targetDate);
  }
}

