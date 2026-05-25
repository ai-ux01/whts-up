import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { SecretsCryptoService } from '../crypto/secrets-crypto.service';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private queueService: QueueService,
    private secrets: SecretsCryptoService,
  ) {}

  async check() {
    let db: 'up' | 'down' = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }

    const redisConfigured = !!this.config.get<string>('REDIS_URL')?.trim();
    let redis: 'up' | 'down' | 'skipped' = 'skipped';
    if (redisConfigured) {
      redis = (await this.queueService.pingRedis()) ? 'up' : 'down';
    }

    const ok =
      db === 'up' && (redis === 'skipped' || redis === 'up');

    return {
      status: ok ? 'ok' : 'degraded',
      db,
      redis,
      queueMode: this.queueService.getMode(),
      secretsEncrypted: this.secrets.isEnabled(),
      timestamp: new Date().toISOString(),
    };
  }
}
