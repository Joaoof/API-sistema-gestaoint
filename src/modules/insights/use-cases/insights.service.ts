import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AiCreditsService } from '../../aiCredits/use-cases/credits.service';
import { OpenAiClient } from '../../ai/use-cases/openai.client';
import { ReportsService } from '../../reports/use-cases/reports.service';

const INSIGHT_MODEL = process.env.INSIGHT_MODEL ?? 'gpt-4o-mini';
const INSIGHT_COST = 5; // 5 créditos por insight gerado

const SYSTEM = `Você é um analista financeiro/comercial sênior. Vai receber métricas reais
de uma empresa brasileira em formato JSON. Sua tarefa: gerar 2-3 INSIGHTS
acionáveis, em português pt-BR, no formato:

TÍTULO: <uma frase chamativa, max 70 chars>
RESUMO:
- <bullet 1, dado concreto + interpretação>
- <bullet 2>
- <bullet 3 — recomendação prática>

Regras:
- Use números reais do JSON (não invente).
- Linguagem direta, comerciante, sem jargão financeiro pesado.
- Se não tiver dado suficiente pra uma análise, diga claramente "dados insuficientes".
- Formato monetário: R$ 1.234,56 (ponto milhar, vírgula decimal).
`;

@Injectable()
export class InsightsService implements OnModuleInit {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiClient,
    private readonly reports: ReportsService,
    private readonly credits: AiCreditsService,
  ) {}

  onModuleInit() {
    if (process.env.INSIGHTS_DISABLED === 'true') return;

    // Diário às 7:30
    cron.schedule('30 7 * * *', () => {
      this.runForAllCompanies('DAILY').catch((err) =>
        this.logger.error(`Insight DAILY falhou: ${err}`),
      );
    });

    // Semanal segunda 8h
    cron.schedule('0 8 * * 1', () => {
      this.runForAllCompanies('WEEKLY').catch((err) =>
        this.logger.error(`Insight WEEKLY falhou: ${err}`),
      );
    });

    this.logger.log('Insights agendados: diário 07:30, semanal seg 08:00.');
  }

  /**
   * Roda pra todas as empresas que têm créditos suficientes.
   */
  async runForAllCompanies(kind: 'DAILY' | 'WEEKLY') {
    const accounts = await this.prisma.aiCreditAccount.findMany({
      where: { balance: { gte: INSIGHT_COST } },
    });
    this.logger.log(`Insights ${kind} para ${accounts.length} empresa(s).`);
    for (const acc of accounts) {
      try {
        await this.generate(acc.companyId, kind);
      } catch (err) {
        this.logger.warn(`Insight para company ${acc.companyId} falhou: ${err}`);
      }
    }
  }

  async generate(companyId: string, kind: 'DAILY' | 'WEEKLY' | 'MANUAL') {
    // 1) Coleta métricas
    const metrics =
      kind === 'WEEKLY' ? await this.reports.weekly() : await this.reports.daily();

    // 2) Cobra créditos antes de chamar OpenAI
    await this.credits.consume({
      companyId,
      amount: INSIGHT_COST,
      description: `Insight ${kind}`,
      refType: 'Insight',
      refId: undefined,
    });

    // 3) Chama OpenAI
    const res = await this.openai.chat({
      model: INSIGHT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Tipo: ${kind}\n\nMétricas:\n${JSON.stringify(metrics, null, 2)}`,
        },
      ],
      temperature: 0.5,
    });

    const content = res.choices[0]?.message?.content ?? '';

    // 4) Parseia título / corpo
    const titleMatch = content.match(/^T[ÍI]TULO:\s*(.+)$/im);
    const title = titleMatch?.[1]?.trim().slice(0, 120) ?? `Insight ${kind.toLowerCase()}`;
    const body = content.replace(/^T[ÍI]TULO:.*$/im, '').trim();

    // 5) Persiste
    const insight = await this.prisma.insight.create({
      data: {
        companyId,
        kind,
        title,
        body,
        metricsJson: metrics as any,
        generatedByModel: INSIGHT_MODEL,
        creditsCost: INSIGHT_COST,
        deliveredChannels: ['dashboard', 'notification'],
      },
    });

    // 6) Cria notificação no sininho
    await this.prisma.notification
      .create({
        data: {
          companyId,
          title: `🔮 ${title}`,
          message: body.slice(0, 240),
          type: 'INFO',
          severity: 'INFO',
        } as any,
      })
      .catch((err) => this.logger.warn(`Notificação falhou: ${err.message}`));

    return insight;
  }

  async listLatest(companyId: string, kind?: string, limit = 10) {
    return this.prisma.insight.findMany({
      where: {
        companyId,
        ...(kind ? { kind } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
  }
}
