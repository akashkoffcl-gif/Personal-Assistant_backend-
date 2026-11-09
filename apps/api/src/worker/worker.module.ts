import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { OutboxModule } from '../modules/outbox/outbox.module';
import { WorkerService } from './worker.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    NotificationsModule,
    OutboxModule,
  ],
  providers: [WorkerService],
  exports: [WorkerService],
})
export class WorkerModule {}
