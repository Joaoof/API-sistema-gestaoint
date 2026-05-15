import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EvolutionTenantClient } from './evolution-tenant.client';
import { ModuleConfigService } from '../../featureFlag/use-cases/module-config.service';

/**
 * Motor de chatbot por empresa.
 *
 *  - Reusa o model WhatsappChatbotRule (trigger/pattern/responseBody)
 *    pra casar a mensagem recebida.
 *  - Se nenhum rule casar e o módulo `ai_assistant` estiver habilitado
 *    para a empresa COM apiKey configurada, gera resposta via IA
 *    (OpenAI/Anthropic) usando a key da empresa.
 *  - Registra a interação em WhatsappChatbotLog.
 */
@Injectable()
export class EvolutionChatbotEngineService {
  private readonly logger = new Logger(EvolutionChatbotEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionTenantClient,
    private readonly moduleConfig: ModuleConfigService,
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
    const aiReply = await this.tryAiReply(companyId, text).catch((e) => {
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
   * Tenta gerar resposta via IA usando a chave da empresa (BYOK).
   * Volta null se módulo não habilitado ou chave ausente.
   */
  private async tryAiReply(companyId: string, userText: string): Promise<string | null> {
    const cfg = await this.moduleConfig.getDecryptedConfig(companyId, 'ai_assistant').catch(() => null);
    if (!cfg) return null;
    const apiKey = (cfg.apiKey as string | undefined)?.trim();
    if (!apiKey) return null;

    const provider = ((cfg.provider as string | undefined) ?? 'openai').toLowerCase();
    const model = (cfg.model as string | undefined) ?? 'gpt-4o-mini';

    if (provider === 'openai') {
      return this.openAiReply(apiKey, model, userText);
    }
    if (provider === 'anthropic') {
      return this.anthropicReply(apiKey, model, userText);
    }
    this.logger.warn(`Provider IA "${provider}" não suportado.`);
    return null;
  }

  private async openAiReply(apiKey: string, model: string, userText: string): Promise<string | null> {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Você é um atendente automatizado simpático e direto. Responda em pt-BR, no máximo 2 parágrafos.',
            },
            { role: 'user', content: userText },
          ],
          temperature: 0.7,
        }),
      });
      if (!res.ok) {
        this.logger.warn(`OpenAI ${res.status}: ${await res.text()}`);
        return null;
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return json.choices?.[0]?.message?.content?.trim() ?? null;
    } catch (e) {
      this.logger.warn(`OpenAI exception: ${(e as Error).message}`);
      return null;
    }
  }

  private async anthropicReply(apiKey: string, model: string, userText: string): Promise<string | null> {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 600,
          system: 'Você é um atendente automatizado simpático e direto. Responda em pt-BR, no máximo 2 parágrafos.',
          messages: [{ role: 'user', content: userText }],
        }),
      });
      if (!res.ok) {
        this.logger.warn(`Anthropic ${res.status}: ${await res.text()}`);
        return null;
      }
      const json = (await res.json()) as {
        content?: { type: string; text?: string }[];
      };
      const text = json.content?.find((c) => c.type === 'text')?.text;
      return text?.trim() ?? null;
    } catch (e) {
      this.logger.warn(`Anthropic exception: ${(e as Error).message}`);
      return null;
    }
  }
}
