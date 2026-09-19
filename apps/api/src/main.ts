import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Validate required configuration at boot. Always requires DATABASE_URL.
 * In production, additionally enforces strong secrets and CORS so a
 * misconfigured deploy fails loudly instead of running insecurely.
 */
function validateConfig(config: ConfigService, logger: Logger) {
  const problems: string[] = [];
  const isProd = config.get<string>('NODE_ENV') === 'production';

  // Always required (any environment).
  if (!config.get<string>('DATABASE_URL')?.trim()) {
    problems.push('DATABASE_URL is not set');
  }

  if (isProd) {
    const weak = (v?: string) => !v || v.trim().length < 32 || v.includes('change-me');
    if (weak(config.get<string>('JWT_ACCESS_SECRET'))) {
      problems.push('JWT_ACCESS_SECRET is missing, too short, or a placeholder');
    }
    if (weak(config.get<string>('JWT_REFRESH_SECRET'))) {
      problems.push('JWT_REFRESH_SECRET is missing, too short, or a placeholder');
    }
    if (!config.get<string>('ENCRYPTION_KEY')?.trim()) {
      problems.push('ENCRYPTION_KEY is not set — OAuth/WhatsApp tokens would be stored in plaintext');
    }
    if (!config.get<string>('CORS_ORIGIN')?.trim()) {
      problems.push('CORS_ORIGIN is not set — defaulting to localhost blocks the deployed frontend');
    }

    // Warn (not fatal) on provider keys that silently degrade to mock/no-op.
    const softWarn = (key: string, effect: string) => {
      if (!config.get<string>(key)?.trim()) {
        logger.warn(`${key} not set — ${effect}`);
      }
    };
    softWarn('OPENAI_API_KEY', 'AI features run in mock/fallback mode (unless OLLAMA_MODE=on)');
    softWarn('GOOGLE_PLACES_API_KEY', 'competitor discovery + Google reviews use demo data');
    softWarn('SUPABASE_URL', 'media/reel uploads return mock local paths');
    softWarn('WHATSAPP_ACCESS_TOKEN', 'WhatsApp sends run in sandbox simulation');
  }

  if (problems.length) {
    logger.error(
      `Refusing to start due to invalid configuration:\n - ${problems.join('\n - ')}`,
    );
    process.exit(1);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  validateConfig(config, logger);

  // Security headers. crossOriginResourcePolicy relaxed so the SPA on another
  // origin can consume API responses; HSTS/CSP/frameguard/noSniff stay on.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Ensure OnModuleDestroy (queue teardown, Prisma disconnect) runs on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'v1/whatsapp/webhook', method: RequestMethod.GET },
      { path: 'v1/whatsapp/webhook', method: RequestMethod.POST },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const corsOrigin = config.get<string>('CORS_ORIGIN') || 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  const port = Number(process.env.PORT || config.get('PORT') || 4000);
  await app.listen(port, '0.0.0.0');
  logger.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();
