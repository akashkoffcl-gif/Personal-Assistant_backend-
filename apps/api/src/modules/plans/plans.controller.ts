import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PlansService } from './plans.service';

@Controller('plans')
@UseGuards(SupabaseAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get(':date')
  async getDayPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('date') date: string,
  ) {
    return this.plansService.getDayPlan(user.id, date);
  }

  @Post(':date/lock')
  async lockPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('date') date: string,
    @Body('isLocked') isLocked: boolean,
  ) {
    return this.plansService.lockPlan(user.id, date, isLocked);
  }
}
