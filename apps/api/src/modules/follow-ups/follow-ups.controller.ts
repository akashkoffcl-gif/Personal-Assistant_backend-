import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FollowUpsService, RespondFollowUpDto } from './follow-ups.service';

@Controller('follow-ups')
@UseGuards(SupabaseAuthGuard)
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Get('pending')
  async getPendingFollowUps(@CurrentUser() user: AuthenticatedUser) {
    return this.followUpsService.getPendingFollowUps(user.id);
  }

  @Post('respond')
  async respondToFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RespondFollowUpDto,
  ) {
    return this.followUpsService.respondToFollowUp(user.id, body);
  }
}

