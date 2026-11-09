import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  try {
    const app = await NestFactory.createApplicationContext(WorkerModule);
    app.enableShutdownHooks();

    logger.log('BullMQ background worker process is running and monitoring reminder queues.');

    const shutdown = async (signal: string) => {
      logger.log(`Received ${signal}. Gracefully shutting down worker...`);
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error: any) {
    logger.error('Worker bootstrap failed:', error?.message || error);
    process.exit(1);
  }
}

bootstrap();
