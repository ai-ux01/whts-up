import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private healthService: HealthService) {}

  /** Full status (backward compatible). Always 200 with a status field. */
  @Get()
  check() {
    return this.healthService.check();
  }

  /**
   * Liveness: is the process up and able to respond? No dependency checks.
   * A failing liveness probe means "restart me". DB/Redis blips must NOT flip it.
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Readiness: can the app serve traffic (dependencies reachable)?
   * Returns 503 when degraded so load balancers stop routing until healthy.
   */
  @Get('ready')
  async ready(@Res() res: Response) {
    const result = await this.healthService.check();
    const code =
      result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(code).json(result);
  }
}
