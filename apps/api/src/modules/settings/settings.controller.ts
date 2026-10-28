import { Controller, Get, Patch, Delete, Body, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(SupabaseAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getSettings(user.id);
  }

  @Patch()
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.settingsService.updateSettings(user.id, body);
  }

  @Get('export')
  async exportData(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.exportUserData(user.id);
  }

  @Delete('account')
  async deleteAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.deleteUserData(user.id);
  }
}

