import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from './supabase-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
@UseGuards(SupabaseAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.authService.getProfile(user.id);
    return {
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        timezone: profile.timezone,
        settings: profile.settings,
      },
    };
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { fullName?: string; timezone?: string },
  ) {
    const updated = await this.authService.updateProfile(user.id, body);
    return {
      success: true,
      user: updated,
    };
  }
}
