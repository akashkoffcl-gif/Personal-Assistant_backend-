import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RemindersService } from './reminders.service';

@Controller('reminders')
@UseGuards(SupabaseAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('status')
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.remindersService.getRemindersStatus(user.id);
  }
}
