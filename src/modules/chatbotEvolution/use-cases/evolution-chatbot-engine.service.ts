import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EvolutionTenantClient } from './evolution-tenant.client';
import { ModuleConfigService } from '../../featureFlag/use-cases/module-config.service';
import { AiChatService } from '../../ai/use-cases/ai-chat.service';

/**
 * Motor de chatbot por empresa.
 *
 *  - Reusa o model WhatsappChatbotRule (trigger/pattern/responseBody)
 *    pra casar a mensagem recebida.
 *  - Se nenhum rule casar e o módulo `ai_assistant` estiver habilitado
 *    para a empresa COM apiKey configurada, gera resposta via IA
 *    usando o AiChatService — com tool-calling (vendas, AR, estoque)
 *    e BYOK do tenant.
 *  - Registra a interação em WhatsappChatbotLog.
 */
@Injectable()
export class EvolutionChatbotEngineService {
  private readonly logger = new Logger(EvolutionChatbotEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionTenantClient,
    private readonly moduleConfig: ModuleConfigService,
    private readonly aiChat: AiChatService,
  ) {}

  /**
   * Processa uma mensagem que chegou via webhook.
   * `to` é o JID/numero do contato que mandou a msg.
   */
  async handleIncoming(params: {
    companyId: string;
    peerNumber: string;
    text: string;
    pushName?: string | null;
  }): Promise<{ replied: boolean; replyText?: string; via?: 'rule' | 'ai' | null }> {
    const { companyId, peerNumber, text } = params;
    if (!text || !text.trim()) return { replied: false };

    // 1) Tenta casar uma regra
    const rules = await this.prisma.whatsappChatbotRule.findMany({
      where: { companyId, enabled: true },
      orderBy: { priority: 'asc' },
    });
    const matched = this.matchRule(rules, text);
    if (matched) {
      const cooledDown = await this.respectCooldown(companyId, matched.id, peerNumber, matched.cooldownMinutes);
      if (!cooledDown) {
        return { replied: false };
      }
      const reply = this.renderReply(matched.responseBody, { name: params.pushName ?? '' });
      await this.send(companyId, peerNumber, reply);
      await this.logInteraction({
        companyId,
        ruleId: matched.id,
        peerNumber,
        triggerText: text,
      });
      return { replied: true, replyText: reply, via: 'rule' };
    }

    // 2) Fallback IA, se habilitado
    const aiReply = await this.tryAiReply(companyId, peerNumber, text).catch((e) => {
      this.logger.warn(`Falha IA fallback para ${companyId}: ${e?.message}`);
      return null;
    });
    if (aiReply) {
      await this.send(companyId, peerNumber, aiReply);
      return { replied: true, replyText: aiReply, via: 'ai' };
    }

    return { replied: false };
  }

  private matchRule(
    rules: { id: string; trigger: string; pattern: string | null; responseBody: string; cooldownMinutes: number }[],
    text: string,
  ) {
    const normalized = text.trim().toLowerCase();
    for (const r of rules) {
      const p = (r.pattern ?? '').trim().toLowerCase();
      if (r.trigger === 'keyword' && p && normalized.includes(p)) return r;
      if (r.trigger === 'regex' && r.pattern) {
        try {
          if (new RegExp(r.pattern, 'i').test(text)) return r;
        } catch { /* regex inválido */ }
      }
      if (r.trigger === 'first_message') return r; // fallback genérico
    }
    return null;
  }

  /** Substitui `{{name}}` e outros placeholders básicos. */
  private renderReply(body: string, vars: Record<string, string>): string {
    return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? '');
  }

  /**
   * Garante que a mesma regra não dispare repetidamente para o mesmo peer
   * dentro do cooldown configurado.
   */
  private async respectCooldown(
    companyId: string,
    ruleId: string,
    peerNumber: string,
    cooldownMinutes: number,
  ): Promise<boolean> {
    if (!cooldownMinutes || cooldownMinutes <= 0) return true;
    const since = new Date(Date.now() - cooldownMinutes * 60_000);
    const recent = await this.prisma.whatsappChatbotLog.findFirst({
      where: { companyId, ruleId, peerNumber, firedAt: { gte: since } },
    });
    return !recent;
  }

  private async logInteraction(input: {
    companyId: string;
    ruleId: string;
    peerNumber: string;
    triggerText: string;
  }) {
    try {
      await this.prisma.whatsappChatbotLog.create({ data: input });
    } catch (e) {
      this.logger.warn(`logInteraction falhou: ${(e as Error).message}`);
    }
  }

  private async send(companyId: string, peerNumber: string, text: string) {
    try {
      await this.evolution.sendText(companyId, peerNumber, text);
    } catch (e) {
      this.logger.warn(`sendText falhou (${companyId} → ${peerNumber}): ${(e as Error).message}`);
    }
  }

  /**
   * Gera resposta IA com tool-calling completo via AiChatService.
   *  - BYOK: usa a apiKey da empresa (CompanyModuleOverride.ai_assistant.apiKey).
   *    Se ausente, cai pro OPENAI_API_KEY global do .env.
   *  - Histórico contínuo por peerNumber (sessão de 24h).
   *  - Tools de escrita criam AiPendingAction pro admin aprovar pelo painel.
   *  - Provider 'anthropic' não suportado por aqui (tool-calling é OpenAI-only
   *    no AiChatService) — cai pra OpenAI/env como fallback.
   */
  private async tryAiReply(companyId: string, peerNumber: string, userText: string): Promise<string | null> {
    const cfg = await this.moduleConfig.getDecryptedConfig(companyId, 'ai_assistant').catch(() => null);
    if (!cfg) return null;

    const apiKey = (cfg.apiKey as string | undefined)?.trim() || undefined;
    const model = (cfg.model as string | undefined) ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const provider = ((cfg.provider as string | undefined) ?? 'openai').toLowerCase();

    if (provider === 'anthropic') {
      this.logger.warn(
        `Provider 'anthropic' no canal whatsapp ainda não suporta tools — usando OPENAI_API_KEY global.`,
      );
    }

    try {
      const result = await this.aiChat.chat({
        companyId,
        channel: 'whatsapp',
        peerNumber,
        userMessage: userText,
        model,
        apiKey: provider === 'openai' ? apiKey : undefined,
      });

      let text = result.assistantMessage.content?.trim() || '';
      // Se a IA criou ações pendentes, lembra o cliente que precisa aprovação.
      if (result.pendingActions.length > 0) {
        const lines = result.pendingActions.map((p, i) => `${i + 1}. ${p.description}`).join('\n');
        text =
          (text ? text + '\n\n' : '') +
          `⚠️ Pedi a(s) seguinte(s) ação(ões), aprove no painel:\n${lines}`;
      }
      return text || null;
    } catch (e) {
      this.logger.warn(`AiChatService falhou no whatsapp (${companyId}): ${(e as Error).message}`);
      return null;
    }
  }
}
