import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { RemindersModule } from '../reminders/reminders.module';
import { OutboxModule } from '../outbox/outbox.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, RemindersModule, OutboxModule],
  controllers: [TasksController],
  providers: [TasksService, PrismaService, RedisService],
  exports: [TasksService],
})
export class TasksModule {}
