import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;
  private reconnectingPromise: Promise<void> | null = null;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.connectWithTimeout(10000);
  }

  async connectWithTimeout(timeoutMs = 10000): Promise<boolean> {
    try {
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Connection timeout after ${timeoutMs}ms`)), timeoutMs),
        ),
      ]);
      this.isConnected = true;
      this.logger.log('Authoritative Supabase PostgreSQL connection established.');
      return true;
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(
        `PostgreSQL initial connection unavailable (${error?.message}). Running with dynamic auto-reconnect resilience.`,
      );
      return false;
    }
  }

  /**
   * Safe reconnection guarantee for transient pool drops
   */
  async ensureConnected(): Promise<boolean> {
    if (this.isConnected) return true;
    if (this.reconnectingPromise) {
      await this.reconnectingPromise;
      return this.isConnected;
    }

    this.reconnectingPromise = (async () => {
      try {
        await this.$connect();
        this.isConnected = true;
        this.logger.log('PostgreSQL connection dynamically re-established.');
      } catch (err: any) {
        this.isConnected = false;
        this.logger.warn(`Dynamic reconnect failed: ${err?.message}`);
      } finally {
        this.reconnectingPromise = null;
      }
    })();

    await this.reconnectingPromise;
    return this.isConnected;
  }

  /**
   * Execute a Prisma query with automatic retry on transient pool/connection drops
   */
  async withRetry<T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await operation();
      } catch (err: any) {
        attempt++;
        const msg = err?.message || '';
        const isTransient =
          msg.includes('connection pool') ||
          msg.includes('Can\'t reach database server') ||
          msg.includes('Connection is closed') ||
          msg.includes('Timed out fetching a new connection') ||
          err?.code === 'P1001' ||
          err?.code === 'P1002' ||
          err?.code === 'P1017';

        if (!isTransient || attempt > maxRetries) {
          throw err;
        }

        this.logger.warn(`Transient database error (${msg.slice(0, 80)}...). Reconnecting & retrying (Attempt ${attempt}/${maxRetries})...`);
        this.isConnected = false;
        await this.ensureConnected();
        await new Promise((res) => setTimeout(res, 500 * attempt));
      }
    }
    throw new Error('Database operation failed after retries');
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}
