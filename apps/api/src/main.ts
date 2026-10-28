import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('ApiBootstrap');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3001;
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

  await app.listen(port);
  logger.log(`NestJS API Server is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`API Documentation available on: http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
