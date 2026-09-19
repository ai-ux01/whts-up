import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string | string[]) || message;
        error = (obj.error as string) || error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Structured server-side log with request context. 5xx are logged as errors
    // (with stack) — this is the single choke point to forward to Sentry/Datadog.
    const context = `${request?.method ?? '-'} ${request?.originalUrl ?? request?.url ?? '-'}`;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${status} ${context} — ${Array.isArray(message) ? message.join('; ') : message}`,
        stack,
      );
      this.reportToMonitoring(exception, { status, context });
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(
        `${status} ${context} — ${Array.isArray(message) ? message.join('; ') : message}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request?.originalUrl ?? request?.url,
    });
  }

  /**
   * Forward 5xx errors to Sentry IF (a) SENTRY_DSN is set and (b) the optional
   * @sentry/node package is installed. Kept dependency-free: if the package is
   * absent this is a silent no-op, so the app runs without an APM configured.
   *
   * To enable: `pnpm --filter api add @sentry/node` and set SENTRY_DSN.
   */
  private reportToMonitoring(
    exception: unknown,
    meta: { status: number; context: string },
  ): void {
    if (!process.env.SENTRY_DSN) return;
    const sentry = GlobalExceptionFilter.sentry;
    if (!sentry) return;
    try {
      sentry.captureException(exception, { extra: meta });
    } catch {
      // never let monitoring failures affect the response
    }
  }

  /** Lazily-resolved optional Sentry client (initialized once). */
  private static sentry: { captureException: (e: unknown, o?: unknown) => void } | null =
    (() => {
      if (!process.env.SENTRY_DSN) return null;
      try {
        // Optional dependency — resolved dynamically so the app builds/runs without it.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const s = require('@sentry/node');
        s.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
        return s;
      } catch {
        return null;
      }
    })();
}
