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
      try {
        return await this.client.get(key);
      } catch (err: any) {
        this.isConnected = false;
        this.logger.warn(`Redis get failed (${err.message}); falling back to memory cache.`);
      }
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
      try {
        if (ttlSeconds) {
          return await this.client.set(key, value, 'EX', ttlSeconds);
        }
        return await this.client.set(key, value);
      } catch (err: any) {
        this.isConnected = false;
        this.logger.warn(`Redis set failed (${err.message}); falling back to memory cache.`);
      }
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryCache.set(key, { value, expiresAt });
    return 'OK';
  }

  /**
   * Acquire a distributed lock using Redis SET NX EX.
   * STRICT FAIL-CLOSED POLICY FOR CRITICAL COORDINATION:
   * Distributed locks must NEVER fall back to a process-local in-memory Map in multi-process deployments.
   * If Redis is disconnected or unavailable, this method returns false or fails closed.
   */
  async acquireLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
    const key = `lock:${lockKey}`;
    if (this.isConnected && this.client) {
      try {
        const res = await this.client.set(key, 'LOCKED', 'EX', ttlSeconds, 'NX');
        return res === 'OK';
      } catch (err: any) {
        this.logger.warn(`Failed acquiring distributed lock via Redis: ${err?.message}`);
        return false;
      }
    }

    // Single-process fallback ONLY if verified single-worker topology:
    // DISABLE_WORKER must be true AND ALLOW_LOCAL_LOCK must be explicitly set to 'true'.
    // In multi-worker or dedicated standalone worker deployments, ALLOW_LOCAL_LOCK is strictly rejected.
    const isSingleProcess = process.env.DISABLE_WORKER === 'true' && process.env.ALLOW_LOCAL_LOCK === 'true';
    if (isSingleProcess) {
      const now = Date.now();
      const existing = this.memoryCache.get(key);
      if (existing && existing.expiresAt && existing.expiresAt > now) {
        return false; // lock held
      }
      this.memoryCache.set(key, { value: 'LOCKED', expiresAt: now + ttlSeconds * 1000 });
      return true;
    }

    // Fail-closed for multi-process safety
    this.logger.error(`Distributed lock requested for ${lockKey} but Redis is unavailable. Failing closed.`);
    return false;
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(lockKey: string): Promise<void> {
    const key = `lock:${lockKey}`;
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch (err: any) {
        this.logger.warn(`Failed releasing distributed lock via Redis: ${err?.message}`);
      }
    }
    this.memoryCache.delete(key);
  }

  async del(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      return this.client.del(key);
    }
    return this.memoryCache.delete(key) ? 1 : 0;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await Promise.race([
          (async () => {
            const keys = await this.client!.keys(pattern);
            if (keys && keys.length > 0) {
              await this.client!.del(...keys);
            }
          })(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis invalidate timeout')), 1000)),
        ]);
      }
    } catch (e) {
      // Gracefully fall back to memory cache
    }
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
  }
}

