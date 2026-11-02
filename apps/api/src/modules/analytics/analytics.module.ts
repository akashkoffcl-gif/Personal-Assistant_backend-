import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { UsageAnalyticsService } from './usage-analytics.service';
import { UsageAnalyticsController } from './usage-analytics.controller';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController, UsageAnalyticsController],
  providers: [AnalyticsService, UsageAnalyticsService],
  exports: [AnalyticsService, UsageAnalyticsService],
})
export class AnalyticsModule {}

