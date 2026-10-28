import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  providers: [OutboxService, PrismaService],
  exports: [OutboxService],
})
export class OutboxModule {}
