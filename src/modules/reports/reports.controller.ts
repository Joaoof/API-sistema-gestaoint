import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import {
  AlertsReport,
  DailyReport,
  ReportsService,
  WeeklyReport,
} from './use-cases/reports.service';

/**
 * Endpoints REST consumidos pelo n8n para gerar relatórios e disparar
 * mensagens via Evolution. Protegidos por `X-API-Key` (env REPORTS_API_KEY).
 */
@Controller('api/reports')
@UseGuards(ApiKeyGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('daily')
  async daily(@Query('date') date?: string): Promise<DailyReport> {
    return this.service.daily(date ? new Date(date) : undefined);
  }

  @Get('weekly')
  async weekly(@Query('reference') reference?: string): Promise<WeeklyReport> {
    return this.service.weekly(reference ? new Date(reference) : undefined);
  }

  @Get('alerts')
  async alerts(): Promise<AlertsReport> {
    return this.service.alerts();
  }
}
