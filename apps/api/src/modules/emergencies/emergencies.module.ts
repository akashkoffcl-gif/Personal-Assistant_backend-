import { Module } from '@nestjs/common';
import { EmergenciesService } from './emergencies.service';
import { EmergenciesController } from './emergencies.controller';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { RemindersModule } from '../reminders/reminders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OutboxModule } from '../outbox/outbox.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    SchedulingModule,
    RemindersModule,
    NotificationsModule,
    OutboxModule,
  ],
  controllers: [EmergenciesController],
  providers: [EmergenciesService, PrismaService, RedisService],
  exports: [EmergenciesService],
})
export class EmergenciesModule {}

