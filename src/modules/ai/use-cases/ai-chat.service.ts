import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AiCreditsService } from '../../aiCredits/use-cases/credits.service';
import { AiToolsService, ToolContext } from './ai-tools.service';
import { OpenAiClient, OpenAiMessage } from './openai.client';

// Custo em créditos por turn de IA, por modelo
const MODEL_COST: Record<string, number> = {
  'gpt-4o-mini': 1,
  'gpt-4o': 5,
  'gpt-4-turbo': 4,
};

const SYSTEM_PROMPT_WEB = `Você é o assistente do GestãoInt, um ERP financeiro/comercial brasileiro.

Suas responsabilidades:
- Responder perguntas sobre o sistema e operação do negócio em português brasileiro
- Consultar dados em tempo real usando as tools disponíveis (vendas, contas, estoque)
- Propor ações de escrita (criar conta, marcar como pago, lançar produção) — SEMPRE pedindo confirmação antes
- Dar insights práticos e curtos baseados nos dados reais

Regras:
- Seja direto. Respostas curtas, sem floreio.
- Use formato monetário pt-BR (R$ 1.234,56) e datas brasileiras (DD/MM/AAAA).
- Quando for executar uma ação de escrita, NÃO confirme ao usuário — apenas chame a tool. O sistema vai mostrar a confirmação automaticamente.
- Quando uma tool de escrita for chamada, sua próxima resposta deve só dizer "Vou criar/marcar/lançar X. Confirma?" — não invente que já foi feito.
- Se o usuário não der dados suficientes (ex: "marca como pago" sem dizer qual conta), pergunte antes de chamar tool.
- Se você não tem certeza, diga. Não invente números.`;

const SYSTEM_PROMPT_WHATSAPP = `Você é o atendente automatizado do GestãoInt no WhatsApp.
Você está conversando com o DONO/operador do negócio pelo Zap dele.

Tom:
- Mensagens CURTAS (1-3 frases, máx 2 parágrafos). Sem listas longas.
- Português brasileiro, formato monetário R$ 1.234,56, datas DD/MM/AAAA.
- Pode usar emoji moderadamente (📊 💰 📦 ⚠️) — é WhatsApp.
- Não use markdown pesado (sem #, *, tabelas) — texto plano com quebras simples.

Tools:
- Pra perguntas de consulta (vendas, AR, estoque, alertas) use as tools de leitura.
- Pra ações de ESCRITA (criar conta, marcar como pago, lançar produção): chame a tool normalmente. O sistema vai registrar como pendente e notificar o admin pelo painel — não invente que foi feito.
- Após chamar uma tool de escrita, responda: "Pedi pra criar/marcar/lançar X. Aprove pelo painel."

Se não tiver dados suficientes, pergunte antes de chamar tool.`;

interface ChatResult {
  conversationId: string;
  assistantMessage: {
    id: string;
    content: string;
    createdAt: Date;
  };
  pendingActions: Array<{
    id: string;
    tool: string;
    description: string;
    params: any;
  }>;
}

@Injectable()
export class AiChatService {
  private readonly MAX_TOOL_LOOPS = 4;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiClient,
    private readonly tools: AiToolsService,
    private readonly credits: AiCreditsService,
  ) {}

  async chat(args: {
    userId?: string; // obrigatório para channel='web'; null/system pra channel='whatsapp'
    companyId: string;
    conversationId?: string;
    userMessage: string;
    model?: string;
    /** Canal de origem da conversa. Default 'web'. */
    channel?: 'web' | 'whatsapp';
    /** E.164 sem '@' — obrigatório quando channel='whatsapp' (chave de sessão). */
    peerNumber?: string;
    /** BYOK do tenant — quando vier, usa essa chave em vez de OPENAI_API_KEY do .env. */
    apiKey?: string;
  }): Promise<ChatResult> {
    const channel = args.channel ?? 'web';
    const model = args.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const cost = MODEL_COST[model] ?? 1;
    const systemPrompt = channel === 'whatsapp' ? SYSTEM_PROMPT_WHATSAPP : SYSTEM_PROMPT_WEB;

    if (channel === 'whatsapp' && !args.peerNumber) {
      throw new NotFoundException('peerNumber é obrigatório para canal whatsapp.');
    }
    if (channel === 'web' && !args.userId) {
      throw new NotFoundException('userId é obrigatório para canal web.');
    }

    // 1) Recupera ou cria a conversa (tenant-scoped)
    let conversation = await this.resolveConversation({
      conversationId: args.conversationId,
      companyId: args.companyId,
      userId: args.userId,
      channel,
      peerNumber: args.peerNumber,
      model,
      firstUserMessage: args.userMessage,
    });

    // 2) Adiciona mensagem do usuário
    const userMsg = await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: args.userMessage,
      },
    });
    conversation.messages.push(userMsg);

    // 2.5) Debita créditos do pool correto (web ou whatsapp)
    await this.credits.consume({
      companyId: args.companyId,
      amount: cost,
      description: `Chat IA — ${channel === 'whatsapp' ? 'WhatsApp' : 'Web'} — ${model}`,
      userId: args.userId,
      refType: 'AiMessage',
      refId: userMsg.id,
      channel,
    });

    // 3) Monta histórico para OpenAI
    const messages: OpenAiMessage[] = [{ role: 'system', content: systemPrompt }];
    for (const m of conversation.messages) {
      const msg: OpenAiMessage = { role: m.role as any, content: m.content || '' };
      if (m.toolCalls) msg.tool_calls = m.toolCalls as any;
      if (m.toolCallId) msg.tool_call_id = m.toolCallId;
      if (m.toolName) msg.name = m.toolName;
      messages.push(msg);
    }

    // Para tools de leitura no canal WhatsApp não há userId real — usa placeholder.
    const ctx: ToolContext = {
      userId: args.userId ?? `system:whatsapp:${args.peerNumber ?? 'unknown'}`,
      companyId: args.companyId,
    };
    const pendingActions: ChatResult['pendingActions'] = [];
    let finalAssistantContent = '';

    // 4) Loop de tools (read auto, write cria PendingAction e responde como tool)
    for (let i = 0; i < this.MAX_TOOL_LOOPS; i++) {
      const res = await this.openai.chat({
        model,
        messages,
        tools: this.tools.schemas(),
        apiKey: args.apiKey,
      });
      const choice = res.choices[0];
      const msg = choice.message;

      // Persiste resposta do assistant
      const persisted = await this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: msg.content ?? '',
          toolCalls: (msg.tool_calls as any) ?? undefined,
        },
      });
      messages.push({
        role: 'assistant',
        content: msg.content ?? '',
        tool_calls: msg.tool_calls,
      });

      // Sem tool calls → resposta final
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        finalAssistantContent = msg.content ?? '';
        break;
      }

      // Executa cada tool call
      for (const call of msg.tool_calls) {
        const name = call.function.name;
        let parsedArgs: any = {};
        try {
          parsedArgs = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          parsedArgs = {};
        }

        if (this.tools.isWriteTool(name)) {
          // Cria PendingAction. No canal WhatsApp userId=null e qualquer admin
          // da companyId pode aprovar pelo painel.
          const pending = await this.prisma.aiPendingAction.create({
            data: {
              companyId: args.companyId,
              userId: args.userId ?? null,
              channel,
              peerNumber: args.peerNumber ?? null,
              conversationId: conversation.id,
              tool: name,
              params: parsedArgs,
              description: this.tools.describe(name, parsedArgs),
              status: 'PENDING',
            },
          });
          pendingActions.push({
            id: pending.id,
            tool: name,
            description: pending.description,
            params: parsedArgs,
          });

          // Resposta tool simulada: indica que está pendente de confirmação
          const toolReply = JSON.stringify({
            status: 'pending_user_confirmation',
            pendingActionId: pending.id,
            description: pending.description,
          });
          await this.prisma.aiMessage.create({
            data: {
              conversationId: conversation.id,
              role: 'tool',
              content: toolReply,
              toolCallId: call.id,
              toolName: name,
            },
          });
          messages.push({
            role: 'tool',
            content: toolReply,
            tool_call_id: call.id,
            name,
          });
        } else {
          // Read tool — executa direto
          let result: unknown;
          try {
            result = await this.tools.runReadTool(name, parsedArgs, ctx);
          } catch (e: any) {
            result = { error: e.message };
          }
          const content = JSON.stringify(result).slice(0, 6000);
          await this.prisma.aiMessage.create({
            data: {
              conversationId: conversation.id,
              role: 'tool',
              content,
              toolCallId: call.id,
              toolName: name,
            },
          });
          messages.push({
            role: 'tool',
            content,
            tool_call_id: call.id,
            name,
          });
        }
      }
    }

    // Atualiza updatedAt da conversa
    await this.prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Última mensagem do assistant como retorno principal
    const lastAssistant = await this.prisma.aiMessage.findFirst({
      where: { conversationId: conversation.id, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      conversationId: conversation.id,
      assistantMessage: {
        id: lastAssistant?.id ?? '',
        content: finalAssistantContent || lastAssistant?.content || '',
        createdAt: lastAssistant?.createdAt ?? new Date(),
      },
      pendingActions,
    };
  }

  async executeAction(userId: string, companyId: string, actionId: string) {
    const pending = await this.prisma.aiPendingAction.findUnique({
      where: { id: actionId },
    });
    if (!pending) throw new NotFoundException('Ação não encontrada.');
    // PendingActions com userId=null vêm do canal WhatsApp — qualquer usuário
    // do mesmo tenant pode aprovar (caller já passou pelo GqlAuthGuard).
    if (pending.companyId !== companyId) {
      throw new NotFoundException('Ação não pertence à empresa.');
    }
    if (pending.userId && pending.userId !== userId) {
      throw new NotFoundException('Ação não pertence ao usuário.');
    }
    if (pending.status !== 'PENDING') {
      throw new NotFoundException(`Ação já está em estado ${pending.status}.`);
    }

    try {
      const result = await this.tools.executeWriteTool(pending.tool, pending.params, {
        userId,
        companyId,
      });
      await this.prisma.aiPendingAction.update({
        where: { id: actionId },
        data: {
          status: 'EXECUTED',
          result: result as any,
          resolvedAt: new Date(),
        },
      });
      return { ok: true, result };
    } catch (err: any) {
      await this.prisma.aiPendingAction.update({
        where: { id: actionId },
        data: {
          status: 'FAILED',
          error: err.message,
          resolvedAt: new Date(),
        },
      });
      throw err;
    }
  }

  async cancelAction(userId: string, actionId: string) {
    const pending = await this.prisma.aiPendingAction.findUnique({
      where: { id: actionId },
    });
    if (!pending) {
      throw new NotFoundException('Ação não encontrada.');
    }
    // Mesma regra de executeAction: WhatsApp (userId=null) qualquer admin cancela.
    if (pending.userId && pending.userId !== userId) {
      throw new NotFoundException('Ação não encontrada.');
    }
    await this.prisma.aiPendingAction.update({
      where: { id: actionId },
      data: { status: 'CANCELED', resolvedAt: new Date() },
    });
    return true;
  }

  async listConversations(companyId: string, userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { companyId, userId, channel: 'web' },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async getConversation(companyId: string, userId: string, id: string) {
    const conv = await this.prisma.aiConversation.findFirst({
      where: { id, companyId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conv) {
      throw new NotFoundException('Conversa não encontrada.');
    }
    return conv;
  }

  /**
   * Resolve a conversa pra um turn de chat.
   *
   *  - Se `conversationId` veio, busca + valida tenant.
   *  - Senão, no canal WhatsApp tenta achar a conversa ativa do mesmo
   *    `peerNumber` na janela de 24h (sessão). Fora dessa janela = nova conversa.
   *  - Senão cria nova.
   */
  private async resolveConversation(args: {
    conversationId?: string;
    companyId: string;
    userId?: string;
    channel: 'web' | 'whatsapp';
    peerNumber?: string;
    model: string;
    firstUserMessage: string;
  }) {
    if (args.conversationId) {
      const conv = await this.prisma.aiConversation.findFirst({
        where: { id: args.conversationId, companyId: args.companyId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!conv) throw new NotFoundException('Conversa não encontrada.');
      return conv;
    }

    if (args.channel === 'whatsapp' && args.peerNumber) {
      const since = new Date(Date.now() - WHATSAPP_SESSION_WINDOW_MS);
      const existing = await this.prisma.aiConversation.findFirst({
        where: {
          companyId: args.companyId,
          channel: 'whatsapp',
          peerNumber: args.peerNumber,
          updatedAt: { gte: since },
        },
        orderBy: { updatedAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (existing) return existing;
    }

    return this.prisma.aiConversation.create({
      data: {
        companyId: args.companyId,
        userId: args.userId ?? null,
        channel: args.channel,
        peerNumber: args.peerNumber ?? null,
        model: args.model,
        title: args.firstUserMessage.slice(0, 80),
      },
      include: { messages: true },
    });
  }
}

const WHATSAPP_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;
