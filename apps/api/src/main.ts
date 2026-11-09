import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dns from 'dns';
import * as net from 'net';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Ensure Node.js prioritizes IPv4 over IPv6 on networks with broken IPv6 routing
if (typeof (dns as any).setDefaultResultOrder === 'function') {
  (dns as any).setDefaultResultOrder('ipv4first');
}

/**
 * Pre-flight TCP port check to detect port conflicts before NestFactory bootstrap
 * Tests both IPv6 ('::') and IPv4 ('0.0.0.0') interfaces
 */
async function assertPortAvailable(port: number): Promise<void> {
  const checkInterface = (host: string) =>
    new Promise<void>((resolve, reject) => {
      const tester = net.createServer();
      tester.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          reject(
            new Error(
              `[FATAL] Port ${port} is already in use by another running process (EADDRINUSE on ${host}). ` +
              `Please verify running processes or stop duplicate instances before starting the backend.`
            )
          );
        } else {
          // If IPv6 is unsupported or fails with non-EADDRINUSE, resolve gracefully
          resolve();
        }
      });
      tester.once('listening', () => {
        tester.close(() => resolve());
      });
      tester.listen(port, host);
    });

  await checkInterface('::');
  await checkInterface('0.0.0.0');
}

async function bootstrap() {
  const logger = new Logger('ApiBootstrap');
  
  // 1. Authoritative Port Resolution and Validation
  const rawPort = process.env.PORT || '3001';
  const port = parseInt(rawPort, 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    logger.error(`[FATAL] Invalid PORT configured: "${rawPort}". Expected integer between 1 and 65535.`);
    process.exit(1);
  }

  logger.log(`Initiating NestJS bootstrap on configured authoritative port: ${port}`);

  // 2. Pre-flight port availability verification
  try {
    await assertPortAvailable(port);
  } catch (portErr: any) {
    logger.error(portErr.message);
    process.exit(1);
  }

  // 3. Application instantiation
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.CORS_ORIGIN || '',
    ].filter(Boolean),
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Personal Assistant API')
    .setDescription('Production-ready personal task, routine, smart reminder, emergency scheduling & wellness assistant API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  // 4. Safe Lifecycle Shutdown Handling
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.log(`Received ${signal}. Gracefully stopping NestJS HTTP server and closing connections...`);
    try {
      await app.close();
      logger.log('NestJS HTTP server and associated resources closed cleanly.');
      process.exit(0);
    } catch (err: any) {
      logger.error(`Error during graceful shutdown: ${err?.message || err}`);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  await app.listen(port);
  logger.log(`NestJS API Server is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`API Documentation available on: http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap().catch((err) => {
  const logger = new Logger('ApiBootstrap');
  logger.error('Unexpected error during API bootstrap:', err?.message || err);
  process.exit(1);
});

