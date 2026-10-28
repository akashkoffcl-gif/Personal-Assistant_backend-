import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [AuthController],
  providers: [SupabaseAuthGuard, PrismaService],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
