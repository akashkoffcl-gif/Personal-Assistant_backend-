import { Module } from '@nestjs/common';
import { WellnessService } from './wellness.service';
import { WellnessController } from './wellness.controller';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WellnessController],
  providers: [WellnessService, PrismaService, RedisService],
  exports: [WellnessService],
})
export class WellnessModule {}
