import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from './supabase-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
@UseGuards(SupabaseAuthGuard)
export class AuthController {
  @Get('me')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: {
        id: user.id,
        email: user.email,
        timezone: user.timezone,
      },
    };
  }
}
