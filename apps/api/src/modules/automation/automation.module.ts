import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { PrismaService } from '../../common/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  controllers: [AutomationController],
  providers: [
    AutomationService,
    PrismaService,
    OutboxService,
    NotificationsService,
  ],
  exports: [AutomationService],
})
export class AutomationModule {}

