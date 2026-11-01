import { Module } from '@nestjs/common';
import { FollowUpsController } from './follow-ups.controller';
import { FollowUpsService } from './follow-ups.service';
import { PrismaService } from '../../common/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FollowUpsController],
  providers: [FollowUpsService, PrismaService],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
