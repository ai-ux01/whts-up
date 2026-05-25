import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

@Injectable()
export class SecretsCryptoService {
  private readonly logger = new Logger(SecretsCryptoService.name);
  private readonly key: Buffer | null;

  constructor(private config: ConfigService) {
    const raw = this.config.get<string>('ENCRYPTION_KEY')?.trim();
    if (!raw) {
      this.key = null;
      this.logger.warn(
        'ENCRYPTION_KEY not set — WhatsApp tokens stored in DB as plain text',
      );
      return;
    }
    try {
      const buf = Buffer.from(raw, raw.length === 64 ? 'hex' : 'base64');
      if (buf.length !== 32) {
        throw new Error(`expected 32 bytes, got ${buf.length}`);
      }
      this.key = buf;
    } catch (err) {
      this.logger.error('Invalid ENCRYPTION_KEY', err);
      this.key = null;
    }
  }

  isEnabled(): boolean {
    return this.key !== null;
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(PREFIX);
  }

  encrypt(plain: string): string {
    if (!this.key) return plain;
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, tag, enc]).toString('base64');
    return `${PREFIX}${payload}`;
  }

  decrypt(stored: string): string {
    if (!stored.startsWith(PREFIX)) return stored;
    if (!this.key) {
      throw new Error('ENCRYPTION_KEY required to decrypt stored token');
    }
    const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + 16);
    const data = raw.subarray(IV_LEN + 16);
    const decipher = crypto.createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }

  encryptIfNeeded(plain: string | null | undefined): string | null {
    if (!plain) return null;
    if (this.isEncrypted(plain)) return plain;
    return this.encrypt(plain);
  }

  decryptIfNeeded(stored: string | null | undefined): string | null {
    if (!stored) return null;
    if (!this.isEncrypted(stored)) return stored;
    return this.decrypt(stored);
  }
}
