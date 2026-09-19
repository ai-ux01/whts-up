import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SecretsCryptoService } from '../crypto/secrets-crypto.service';
import { extractIgsid } from './messaging.util';

type InstagramResult = { messageId: string; status: string };

const GRAPH = 'https://graph.facebook.com/v21.0';

/**
 * Instagram Direct Message sending via the Meta Instagram Messaging API.
 *
 * IMPORTANT: The Instagram Messaging API can only send messages to users who
 * have messaged the business first, and recipients are addressed by their
 * Instagram-scoped ID (IGSID) — NOT by @username. The IGSID is captured on
 * inbound webhooks and stored on the Contact metadata as `igsid`.
 *
 * Real send requires:
 *  - a connected Meta page/IG token on the workspace (metaOAuthToken / whatsappAccessToken)
 *  - the recipient IGSID (passed in, or read from contact metadata by the caller)
 *
 * When either is missing, it falls back to a clearly-logged mock send so
 * demos and outbound-to-username campaigns don't crash.
 */
@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly secrets: SecretsCryptoService,
  ) {}

  /**
   * @param recipient  IGSID of the recipient (preferred). If it is not a numeric
   *                   IGSID (e.g. a username or phone was passed), the send falls
   *                   back to mock because the API cannot target usernames.
   */
  async sendInstagramDm(
    workspaceId: string,
    recipient: string,
    text: string,
  ): Promise<InstagramResult> {
    const token = await this.resolveToken(workspaceId);
    const igsid = this.extractIgsid(recipient);

    if (!token || !igsid) {
      return this.sendMock(workspaceId, recipient, text, !token ? 'no-token' : 'no-igsid');
    }

    try {
      const res = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: igsid },
          message: { text },
          messaging_type: 'RESPONSE',
        }),
      });

      const data = (await res.json()) as {
        message_id?: string;
        error?: { message?: string };
      };
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || res.statusText);
      }
      this.logger.log(`[IG] Sent DM to ${igsid} (workspace: ${workspaceId})`);
      return { messageId: data.message_id || `ig_${Date.now()}`, status: 'sent' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Instagram send failed';
      this.logger.error(`[IG] Failed to ${igsid}: ${message}`);
      throw err;
    }
  }

  private async resolveToken(workspaceId: string): Promise<string | null> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { metaOAuthToken: true, whatsappAccessToken: true },
    });
    let token: string | null = null;
    try {
      token =
        this.secrets.decryptIfNeeded(workspace?.metaOAuthToken ?? null) ||
        this.secrets.decryptIfNeeded(workspace?.whatsappAccessToken ?? null);
    } catch (err) {
      this.logger.warn(`[IG] Token decrypt failed: ${(err as Error).message}`);
    }
    return token || this.config.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim() || null;
  }

  /** A valid IGSID is a long numeric string. Anything else can't be targeted. */
  private extractIgsid(recipient: string): string | null {
    return extractIgsid(recipient);
  }

  private sendMock(
    workspaceId: string,
    recipient: string,
    text: string,
    reason: string,
  ): InstagramResult {
    this.logger.warn(
      `[IG:mock] Simulated DM to "${recipient}" (workspace: ${workspaceId}, reason: ${reason}): "${text}"`,
    );
    return {
      messageId: `ig_mock_${Math.random().toString(36).substring(2, 15)}`,
      status: 'sent',
    };
  }
}
