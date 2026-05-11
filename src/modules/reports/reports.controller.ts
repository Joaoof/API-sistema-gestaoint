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
 *
 * Tenant: aceita query param `companyId`. Se omitido, agrega TODAS as empresas
 * (uso histórico do n8n cron). Recomendado configurar 1 schedule por empresa
 * passando o `companyId` explicitamente quando virar SaaS de verdade.
 */
@Controller('api/reports')
@UseGuards(ApiKeyGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('daily')
  async daily(
    @Query('companyId') companyId?: string,
    @Query('date') date?: string,
  ): Promise<DailyReport> {
    return this.service.daily(companyId, date ? new Date(date) : undefined);
  }

  @Get('weekly')
  async weekly(
    @Query('companyId') companyId?: string,
    @Query('reference') reference?: string,
  ): Promise<WeeklyReport> {
    return this.service.weekly(companyId, reference ? new Date(reference) : undefined);
  }

  @Get('alerts')
  async alerts(@Query('companyId') companyId?: string): Promise<AlertsReport> {
    return this.service.alerts(companyId);
  }
}
