import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsageAnalyticsService } from './usage-analytics.service';

@Controller('analytics/usage')
@UseGuards(SupabaseAuthGuard)
export class UsageAnalyticsController {
  constructor(private readonly usageAnalyticsService: UsageAnalyticsService) {}

  @Get('overview')
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: number,
  ) {
    return this.usageAnalyticsService.getOverview(user.id, days ? Number(days) : 30);
  }

  @Get('trends')
  async getTrends(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: number,
  ) {
    return this.usageAnalyticsService.getTrends(user.id, days ? Number(days) : 14);
  }

  @Get('modules')
  async getModules(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: number,
  ) {
    return this.usageAnalyticsService.getModules(user.id, days ? Number(days) : 30);
  }

  @Get('features')
  async getFeatures(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: number,
  ) {
    return this.usageAnalyticsService.getFeatures(user.id, days ? Number(days) : 30);
  }

  @Get('automation')
  async getAutomationAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: number,
  ) {
    return this.usageAnalyticsService.getAutomationAnalytics(user.id, days ? Number(days) : 30);
  }

  @Get('reminders')
  async getReminderAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: number,
  ) {
    return this.usageAnalyticsService.getReminderAnalytics(user.id, days ? Number(days) : 30);
  }

  @Get('events')
  async getEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('module') module?: string,
    @Query('feature') feature?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.usageAnalyticsService.getEvents(user.id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
      module,
      feature,
      status,
      startDate,
      endDate,
    });
  }

  @Post('events')
  async recordEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      eventName: string;
      module: string;
      feature: string;
      action?: string;
      status?: string;
      sessionId?: string;
      metadata?: any;
      idempotencyKey?: string;
    },
  ) {
    return this.usageAnalyticsService.recordEvent(user.id, body);
  }
}

