import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    try {
      // Fast connection timeout race (5s) to prevent blocking when database is offline
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout after 5000ms')), 5000),
        ),
      ]);
      this.isConnected = true;
      this.logger.log('Authoritative Supabase PostgreSQL connection established.');
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(
        `PostgreSQL connection unavailable (${error?.message}). Running in mock/development resilience mode.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}
