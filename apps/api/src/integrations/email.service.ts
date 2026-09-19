import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveEmailProvider, toEmailHtml } from './messaging.util';

type EmailResult = { messageId: string; status: string };

/**
 * Email delivery service (HTTP APIs only — no SMTP dependency, works on free hosts).
 *
 * Providers, selected automatically from env:
 *  - Resend   (EMAIL_PROVIDER=resend):   RESEND_API_KEY, EMAIL_FROM
 *  - SendGrid (EMAIL_PROVIDER=sendgrid): SENDGRID_API_KEY, EMAIL_FROM
 *
 * Falls back to a mock send (logs only) when nothing is configured.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  private provider(): 'resend' | 'sendgrid' | 'mock' {
    return resolveEmailProvider({
      EMAIL_PROVIDER: this.config.get<string>('EMAIL_PROVIDER'),
      RESEND_API_KEY: this.config.get<string>('RESEND_API_KEY'),
      SENDGRID_API_KEY: this.config.get<string>('SENDGRID_API_KEY'),
    });
  }

  private fromAddress(): string {
    return this.config.get<string>('EMAIL_FROM')?.trim() || 'onboarding@resend.dev';
  }

  async sendEmail(
    workspaceId: string,
    toEmail: string,
    subject: string,
    body: string,
  ): Promise<EmailResult> {
    const provider = this.provider();
    try {
      switch (provider) {
        case 'resend':
          return await this.sendViaResend(toEmail, subject, body);
        case 'sendgrid':
          return await this.sendViaSendgrid(toEmail, subject, body);
        default:
          return this.sendMock(workspaceId, toEmail, subject, body);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email send failed';
      this.logger.error(`[EMAIL:${provider}] Failed to <${toEmail}>: ${message}`);
      throw err;
    }
  }

  private async sendViaResend(
    toEmail: string,
    subject: string,
    body: string,
  ): Promise<EmailResult> {
    const apiKey = this.config.getOrThrow<string>('RESEND_API_KEY').trim();
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromAddress(),
        to: [toEmail],
        subject,
        html: this.toHtml(body),
      }),
    });

    const data = (await res.json()) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      throw new Error(`Resend error: ${data.message || data.name || res.statusText}`);
    }
    this.logger.log(`[EMAIL:resend] Sent to <${toEmail}> (id=${data.id})`);
    return { messageId: data.id || `resend_${Date.now()}`, status: 'sent' };
  }

  private async sendViaSendgrid(
    toEmail: string,
    subject: string,
    body: string,
  ): Promise<EmailResult> {
    const apiKey = this.config.getOrThrow<string>('SENDGRID_API_KEY').trim();
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: this.fromAddress() },
        subject,
        content: [{ type: 'text/html', value: this.toHtml(body) }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid error: ${errText || res.statusText}`);
    }
    // SendGrid returns the message id in a response header, 202 with empty body.
    const messageId = res.headers.get('x-message-id') || `sendgrid_${Date.now()}`;
    this.logger.log(`[EMAIL:sendgrid] Sent to <${toEmail}> (id=${messageId})`);
    return { messageId, status: 'sent' };
  }

  private sendMock(
    workspaceId: string,
    toEmail: string,
    subject: string,
    body: string,
  ): EmailResult {
    // In production, refuse to fake a send so campaigns never report false success.
    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.error(
        `[EMAIL] No email provider configured in production — refusing to fake a send to <${toEmail}>.`,
      );
      throw new ServiceUnavailableException(
        'Email is not configured. Set EMAIL_PROVIDER with Resend or SendGrid credentials to send email.',
      );
    }
    this.logger.warn(
      `[EMAIL:mock] No email provider configured. Simulated send to <${toEmail}> (workspace: ${workspaceId}) | Subject: "${subject}" | Body: "${body}"`,
    );
    return {
      messageId: `email_mock_${Math.random().toString(36).substring(2, 15)}`,
      status: 'sent',
    };
  }

  private toHtml(body: string): string {
    return toEmailHtml(body);
  }
}
