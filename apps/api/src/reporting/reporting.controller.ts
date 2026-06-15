import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientUserGuard } from '../common/guards/client-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { requireWorkspaceId } from '../common/utils/workspace-id';

@Controller('competitors/reports')
@UseGuards(JwtAuthGuard, ClientUserGuard)
export class ReportingController {
  constructor(private reportingService: ReportingService) {}

  @Get('executive')
  async downloadExecutiveReport(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const workspaceId = requireWorkspaceId(user);
    const csvContent = await this.reportingService.generateExecutiveCsv(workspaceId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="competitor_executive_report.csv"',
    );
    res.status(200).send(csvContent);
  }
}
