import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { OutboxService } from '../modules/outbox/outbox.service';

@Module({
  providers: [
    WorkerService,
    PrismaService,
    NotificationsService,
    OutboxService,
  ],
})
export class WorkerModule {}

