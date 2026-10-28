import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memoryCache = new Map<string, { value: string; expiresAt?: number }>();
  public isConnected = false;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: () => null, // don't loop endlessly if redis server isn't up
      });

      this.client.on('error', (err) => {
        if (!this.isConnected) {
          // suppress repeated logs during startup
        }
      });

      await this.client.connect();
      this.isConnected = true;
      this.logger.log('Redis connected successfully for caching and BullMQ coordination.');
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`Redis connection unavailable at ${redisUrl}. Using in-memory fallback cache for local operation.`);
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      return this.client.get(key);
    }
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (this.isConnected && this.client) {
      if (ttlSeconds) {
        return this.client.set(key, value, 'EX', ttlSeconds);
      }
      return this.client.set(key, value);
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryCache.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      return this.client.del(key);
    }
    return this.memoryCache.delete(key) ? 1 : 0;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (this.isConnected && this.client) {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } else {
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
  }
}

