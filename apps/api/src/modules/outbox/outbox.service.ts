import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { OutboxEventStatus } from '@assistant/shared';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  async publish(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: any,
  ) {
    if (this.prisma.isConnected) {
      try {
        return await this.prisma.withRetry(() =>
          this.prisma.outboxEvent.create({
            data: {
              aggregateType,
              aggregateId,
              eventType,
              payload,
              status: OutboxEventStatus.PENDING,
            },
          }),
        );
      } catch (err: any) {
        this.logger.error(`Failed to write outbox event: ${err?.message}`);
      }
    } else {
      this.logger.debug(`[Outbox InMemory] ${aggregateType}:${aggregateId} - ${eventType}`);
    }
  }

  async getPendingEvents(limit = 50) {
    if (!this.prisma.isConnected) return [];
    try {
      return await this.prisma.withRetry(() =>
        this.prisma.outboxEvent.findMany({
          where: { status: OutboxEventStatus.PENDING },
          orderBy: { createdAt: 'asc' },
          take: limit,
        }),
      );
    } catch (err: any) {
      this.logger.warn(`Failed reading pending outbox events: ${err?.message}`);
      return [];
    }
  }

  async markProcessed(id: string) {
    if (!this.prisma.isConnected) return;
    try {
      await this.prisma.withRetry(() =>
        this.prisma.outboxEvent.update({
          where: { id },
          data: {
            status: OutboxEventStatus.PROCESSED,
            processedAt: new Date(),
          },
        }),
      );
    } catch (err: any) {
      this.logger.warn(`Failed marking outbox event ${id} processed: ${err?.message}`);
    }
  }

  async markFailed(id: string, error: string) {
    if (!this.prisma.isConnected) return;
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.FAILED,
        lastError: error,
        retryCount: { increment: 1 },
      },
    });
  }
}

