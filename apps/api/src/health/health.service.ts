import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { SecretsCryptoService } from '../crypto/secrets-crypto.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private queueService: QueueService,
    private secrets: SecretsCryptoService,
    private aiService: AiService,
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

    // AI provider status: verified | invalid | unconfigured | pending
    const keyVerified = this.aiService.isKeyVerified();
    const ai =
      keyVerified === true
        ? 'verified'
        : keyVerified === false
          ? 'invalid'
          : this.config.get<string>('OLLAMA_MODE') === 'on' ||
              this.config.get<string>('OPENAI_API_KEY')?.trim()
            ? 'pending'
            : 'unconfigured';

    return {
      status: ok ? 'ok' : 'degraded',
      db,
      redis,
      ai,
      queueMode: this.queueService.getMode(),
      secretsEncrypted: this.secrets.isEnabled(),
      timestamp: new Date().toISOString(),
    };
  }
}
