import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [AuthController],
  providers: [SupabaseAuthGuard, AuthService, PrismaService],
  exports: [SupabaseAuthGuard, AuthService],
})
export class AuthModule {}
