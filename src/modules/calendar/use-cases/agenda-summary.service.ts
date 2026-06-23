import { Injectable, Logger } from '@nestjs/common';
import { OpenAiClient } from '../../ai/use-cases/openai.client';
import { CalendarItemEntity } from '../entities/calendar-event.entity';
import { CalendarService } from './calendar.service';

export type AgendaSummaryPeriod = 'DAY' | 'WEEK';

interface SummaryArgs {
  companyId: string;
  period: AgendaSummaryPeriod;
  referenceDate: Date;
  sources?: string[] | null;
}

const SYSTEM_PROMPT = `Você é um assistente executivo brasileiro que resume a agenda do dono de uma empresa de forma direta e prática.

Saída esperada (formato livre, sem markdown pesado):
- 1 parágrafo curto de visão geral (2-3 frases)
- Seções separadas por título em CAIXA ALTA para: COMPROMISSOS, LEMBRETES, FINANCEIRO, ENTREGAS E OUTROS
- Dentro de cada seção, bullets curtos com horário (HH:MM), título e contexto essencial
- Se algo está VENCIDO, marque com (VENCIDO)
- Se uma conta vence hoje/na semana, destaque o valor em R$
- Encerre com 1 linha de "AÇÃO RECOMENDADA" com 1-3 pontos do que o dono deveria atacar primeiro

Regras:
- Tom direto, sem floreio. Sem pedir desculpa, sem "espero que ajude", sem markdown com #.
- Datas em DD/MM/AAAA, horas em HH:MM, dinheiro em R$ 1.234,56.
- Se não houver itens, retorne "Agenda vazia. Nenhum compromisso registrado no período."`;

@Injectable()
export class AgendaSummaryService {
  private readonly logger = new Logger(AgendaSummaryService.name);

  constructor(
    private readonly calendar: CalendarService,
    private readonly openai: OpenAiClient,
  ) {}

  async summarize(args: SummaryArgs): Promise<string> {
    const { start, end, label } = this.computeRange(args.period, args.referenceDate);

    const items = await this.calendar.items(args.companyId, {
      start,
      end,
      sources: args.sources ?? null,
    });

    if (items.length === 0) {
      return `Agenda vazia. Nenhum compromisso registrado no período (${label}).`;
    }

    const userPrompt = this.buildUserPrompt(items, label);

    try {
      const res = await this.openai.chat({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      });
      const text = res.choices?.[0]?.message?.content?.trim();
      if (!text) {
        return this.fallbackSummary(items, label);
      }
      return text;
    } catch (err: any) {
      this.logger.warn(
        `OpenAI falhou (${err?.message ?? err}); retornando fallback determinístico.`,
      );
      return this.fallbackSummary(items, label);
    }
  }

  private computeRange(
    period: AgendaSummaryPeriod,
    ref: Date,
  ): { start: Date; end: Date; label: string } {
    const start = new Date(ref);
    const end = new Date(ref);
    if (period === 'DAY') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: ref.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) };
    }
    // WEEK — domingo→sábado
    const dow = start.getDay();
    start.setDate(start.getDate() - dow);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + (6 - dow));
    end.setHours(23, 59, 59, 999);
    return {
      start,
      end,
      label: `semana de ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`,
    };
  }

  private buildUserPrompt(items: CalendarItemEntity[], label: string): string {
    const lines = items.map((it) => {
      const when = it.allDay
        ? new Date(it.startAt).toLocaleDateString('pt-BR')
        : `${new Date(it.startAt).toLocaleDateString('pt-BR')} ${new Date(it.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const amount = it.amount
        ? ` — R$ ${Number(it.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '';
      const status = it.status ? ` [${it.status}]` : '';
      const loc = it.location ? ` @ ${it.location}` : '';
      return `- (${it.source}) ${when} — ${it.title}${amount}${status}${loc}${it.description ? ` :: ${it.description.slice(0, 120)}` : ''}`;
    });

    return `Resuma a agenda do dono da empresa para o período: ${label}.

Itens (${items.length}):
${lines.join('\n')}

Lembre: produza o resumo conforme o formato pedido no system prompt.`;
  }

  /**
   * Fallback determinístico — usado quando OpenAI falha ou está sem key.
   * Não é IA mas garante que o front sempre recebe algo útil.
   */
  private fallbackSummary(items: CalendarItemEntity[], label: string): string {
    const byGroup: Record<string, CalendarItemEntity[]> = {
      COMPROMISSOS: [],
      LEMBRETES: [],
      FINANCEIRO: [],
      ENTREGAS: [],
      OUTROS: [],
    };
    for (const it of items) {
      if (it.source === 'EVENT') byGroup.COMPROMISSOS.push(it);
      else if (it.source === 'REMINDER') byGroup.LEMBRETES.push(it);
      else if (it.source === 'PAYABLE' || it.source === 'RECEIVABLE') byGroup.FINANCEIRO.push(it);
      else if (it.source === 'DELIVERY') byGroup.ENTREGAS.push(it);
      else byGroup.OUTROS.push(it);
    }

    const overdue = items.filter((it) => it.status === 'OVERDUE').length;
    const overview = `${items.length} item(s) no período (${label}). ${overdue > 0 ? `${overdue} estão VENCIDOS.` : 'Nenhum item vencido.'}`;

    const sections = Object.entries(byGroup)
      .filter(([, list]) => list.length > 0)
      .map(([title, list]) => {
        const bullets = list
          .map((it) => {
            const when = it.allDay
              ? new Date(it.startAt).toLocaleDateString('pt-BR')
              : new Date(it.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const amount = it.amount
              ? ` — R$ ${Number(it.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : '';
            const overdueFlag = it.status === 'OVERDUE' ? ' (VENCIDO)' : '';
            return `• ${when} — ${it.title}${amount}${overdueFlag}`;
          })
          .join('\n');
        return `${title}\n${bullets}`;
      })
      .join('\n\n');

    const action = overdue > 0
      ? 'AÇÃO RECOMENDADA: regularizar os itens vencidos antes de qualquer outra tarefa.'
      : 'AÇÃO RECOMENDADA: confirmar compromissos do dia e checar contas próximas do vencimento.';

    return `${overview}\n\n${sections}\n\n${action}`;
  }
}
