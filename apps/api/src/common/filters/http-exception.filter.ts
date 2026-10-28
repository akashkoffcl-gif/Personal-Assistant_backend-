import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || (res as any).error || message;
        errorType = (res as any).error || exception.name;
      } else {
        message = res;
        errorType = exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorType = exception.name;
    }

    this.logger.error(`[${request.method}] ${request.url} - ${status} - ${JSON.stringify(message)}`);

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorType,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
