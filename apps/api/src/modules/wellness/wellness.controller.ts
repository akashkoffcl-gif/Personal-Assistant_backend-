import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WellnessService } from './wellness.service';

@Controller('wellness')
@UseGuards(SupabaseAuthGuard)
export class WellnessController {
  constructor(private readonly wellnessService: WellnessService) {}

  @Get('metrics')
  async getMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: any,
    @Query('date') date?: string,
    @Query('limit') limit?: number,
  ) {
    return this.wellnessService.getMetrics(user.id, { type, date, limit });
  }

  @Post('metrics')
  async logMetric(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.wellnessService.logMetric(user.id, body);
  }

  @Put('metrics/:id')
  async updateMetric(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.wellnessService.updateMetric(user.id, id, body);
  }

  @Delete('metrics/:id')
  async deleteMetric(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.wellnessService.deleteMetric(user.id, id);
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

