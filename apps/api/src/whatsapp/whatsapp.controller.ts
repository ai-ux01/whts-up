import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  HttpCode,
  RawBodyRequest,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
@SkipThrottle()
export class WhatsAppController {
  constructor(private whatsappService: WhatsAppService) {}

  @Get('webhook')
  async verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = await this.whatsappService.resolveWebhookVerification(
      mode,
      token,
      challenge,
    );
    return res.status(result.statusCode).send(result.body);
  }

  @Post('webhook')
  @HttpCode(200)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    if (!this.whatsappService.validateSignature(rawBody, signature)) {
      return res.status(403).send('Invalid signature');
    }

    await this.whatsappService.handleWebhook(req.body);
    return res.status(200).send('EVENT_RECEIVED');
  }
}
