import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from './common/prisma.service';
import { RedisService } from './common/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    let dbStatus = 'HEALTHY';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'DEGRADED';
    }

    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: this.redis.isConnected ? 'HEALTHY' : 'FALLBACK',
      },
    };
  }

  /**
   * Kubernetes / System Liveness Probe
   * Confirms the HTTP server process is running and accepting event loop cycles.
   */
  @Get('live')
  live() {
    return {
      status: 'LIVE',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Kubernetes / System Readiness Probe
   * Deep check: tests active database and cache connectivity.
   */
  @Get('ready')
  async ready(@Res() res: Response) {
    let dbReady = false;
    let redisReady = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbReady = true;
    } catch (err) {
      dbReady = false;
    }

    redisReady = this.redis.isConnected;

    const isSystemReady = dbReady; // DB is critical dependency
    const responsePayload = {
      status: isSystemReady ? 'READY' : 'UNREADY',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbReady ? 'READY' : 'UNHEALTHY',
        redis: redisReady ? 'READY' : 'FALLBACK_MODE',
      },
    };

    if (isSystemReady) {
      return res.status(HttpStatus.OK).json(responsePayload);
    } else {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(responsePayload);
    }
  }
}
