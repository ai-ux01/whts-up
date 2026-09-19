import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizePhone, resolveSmsProvider } from './messaging.util';

type SmsResult = { messageId: string; status: string };

/**
 * SMS delivery service.
 *
 * Supports two providers, selected automatically from env:
 *  - Twilio  (SMS_PROVIDER=twilio):  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM
 *  - MSG91   (SMS_PROVIDER=msg91):   MSG91_AUTH_KEY, MSG91_SENDER_ID  (popular in India)
 *
 * If no provider is configured it falls back to a mock send (logs only) so
 * local/demo environments keep working without credentials.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  private provider(): 'twilio' | 'msg91' | 'mock' {
    return resolveSmsProvider({
      SMS_PROVIDER: this.config.get<string>('SMS_PROVIDER'),
      TWILIO_ACCOUNT_SID: this.config.get<string>('TWILIO_ACCOUNT_SID'),
      TWILIO_AUTH_TOKEN: this.config.get<string>('TWILIO_AUTH_TOKEN'),
      MSG91_AUTH_KEY: this.config.get<string>('MSG91_AUTH_KEY'),
    });
  }

  async sendSms(workspaceId: string, toPhone: string, text: string): Promise<SmsResult> {
    const provider = this.provider();
    try {
      switch (provider) {
        case 'twilio':
          return await this.sendViaTwilio(toPhone, text);
        case 'msg91':
          return await this.sendViaMsg91(toPhone, text);
        default:
          return this.sendMock(workspaceId, toPhone, text);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'SMS send failed';
      this.logger.error(`[SMS:${provider}] Failed to ${toPhone}: ${message}`);
      throw err;
    }
  }

  private async sendViaTwilio(toPhone: string, text: string): Promise<SmsResult> {
    const accountSid = this.config.getOrThrow<string>('TWILIO_ACCOUNT_SID').trim();
    const authToken = this.config.getOrThrow<string>('TWILIO_AUTH_TOKEN').trim();
    const from = this.config.getOrThrow<string>('TWILIO_SMS_FROM').trim();

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: this.normalizePhone(toPhone),
      From: from,
      Body: text,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = (await res.json()) as { sid?: string; status?: string; message?: string };
    if (!res.ok) {
      throw new Error(`Twilio error: ${data.message || res.statusText}`);
    }
    this.logger.log(`[SMS:twilio] Sent to ${toPhone} (sid=${data.sid})`);
    return { messageId: data.sid || `twilio_${Date.now()}`, status: data.status || 'queued' };
  }

  private async sendViaMsg91(toPhone: string, text: string): Promise<SmsResult> {
    const authKey = this.config.getOrThrow<string>('MSG91_AUTH_KEY').trim();
    const senderId = this.config.get<string>('MSG91_SENDER_ID')?.trim() || 'MSGIND';
    const route = this.config.get<string>('MSG91_ROUTE')?.trim() || '4'; // 4 = transactional

    // MSG91 expects numbers with country code and no '+'
    const number = this.normalizePhone(toPhone).replace(/^\+/, '');

    const res = await fetch('https://api.msg91.com/api/v2/sendsms', {
      method: 'POST',
      headers: {
        authkey: authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        route,
        sms: [{ message: text, to: [number] }],
      }),
    });

    const data = (await res.json()) as { type?: string; message?: string };
    if (!res.ok || data.type === 'error') {
      throw new Error(`MSG91 error: ${data.message || res.statusText}`);
    }
    this.logger.log(`[SMS:msg91] Sent to ${toPhone} (ref=${data.message})`);
    return { messageId: data.message || `msg91_${Date.now()}`, status: 'sent' };
  }

  private sendMock(workspaceId: string, toPhone: string, text: string): SmsResult {
    // In production, refuse to fake a send — a merchant must not see "sent" for a
    // message that was never delivered. Configure an SMS provider to enable sends.
    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.error(
        `[SMS] No SMS provider configured in production — refusing to fake a send to ${toPhone}.`,
      );
      throw new ServiceUnavailableException(
        'SMS is not configured. Set SMS_PROVIDER with Twilio or MSG91 credentials to send SMS.',
      );
    }
    this.logger.warn(
      `[SMS:mock] No SMS provider configured. Simulated send to ${toPhone} (workspace: ${workspaceId}): "${text}"`,
    );
    return {
      messageId: `sms_mock_${Math.random().toString(36).substring(2, 15)}`,
      status: 'sent',
    };
  }

  private normalizePhone(phone: string): string {
    return normalizePhone(phone);
  }
}
