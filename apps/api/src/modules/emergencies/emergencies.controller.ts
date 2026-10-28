import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { EmergenciesService } from './emergencies.service';

@Controller()
@UseGuards(SupabaseAuthGuard)
export class EmergenciesController {
  constructor(private readonly emergenciesService: EmergenciesService) {}

  @Post('emergencies')
  async handleEmergency(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.emergenciesService.handleEmergency(user.id, body);
  }

  @Get('schedule-changes')
  async getScheduleChanges(@CurrentUser() user: AuthenticatedUser) {
    return this.emergenciesService.getScheduleChanges(user.id);
  }

  @Post('emergencies/:id/cancel')
  async cancelEmergency(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.emergenciesService.cancelEmergency(user.id, id);
  }
}
