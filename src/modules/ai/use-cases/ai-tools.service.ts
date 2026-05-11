import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ReportsService } from '../../reports/use-cases/reports.service';
import { OpenAiTool } from './openai.client';

/**
 * Catálogo de tools disponíveis ao agente. Cada tool tem:
 *  - schema (vai pro OpenAI)
 *  - kind: 'read' (executa direto) ou 'write' (cria PendingAction)
 *  - exec: função que roda (pra read) ou monta descrição legível (pra write)
 */
type ToolKind = 'read' | 'write';

interface ToolDef {
  kind: ToolKind;
  schema: OpenAiTool;
  exec: (args: any, ctx: ToolContext) => Promise<unknown>;
  describe?: (args: any) => string; // resumo legível pra confirmação
}

export interface ToolContext {
  userId: string;
  companyId: string;
}

@Injectable()
export class AiToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
  ) {}

  /** Tools disponíveis para o modelo (apenas as definições/schemas). */
  schemas(): OpenAiTool[] {
    return Object.values(this.tools).map((t) => t.schema);
  }

  isWriteTool(name: string): boolean {
    return this.tools[name]?.kind === 'write';
  }

  describe(name: string, args: any): string {
    return this.tools[name]?.describe?.(args) ?? `${name}(${JSON.stringify(args)})`;
  }

  async runReadTool(name: string, args: any, ctx: ToolContext): Promise<unknown> {
    const tool = this.tools[name];
    if (!tool) throw new BadRequestException(`Tool desconhecida: ${name}`);
    if (tool.kind !== 'read') {
      throw new BadRequestException(`Tool ${name} requer confirmação do usuário.`);
    }
    return tool.exec(args, ctx);
  }

  /** Executa uma write tool — chamado pelo executeAiAction depois da confirmação. */
  async executeWriteTool(name: string, args: any, ctx: ToolContext): Promise<unknown> {
    const tool = this.tools[name];
    if (!tool) throw new BadRequestException(`Tool desconhecida: ${name}`);
    if (tool.kind !== 'write') {
      throw new BadRequestException(`Tool ${name} não é de escrita.`);
    }
    return tool.exec(args, ctx);
  }

  // ============================================================
  //                          TOOLS
  // ============================================================
  private readonly tools: Record<string, ToolDef> = {
    // ---------- READ ----------

    getDailySummary: {
      kind: 'read',
      schema: {
        type: 'function',
        function: {
          name: 'getDailySummary',
          description:
            'Resumo do dia (vendas, recebido, pago, métodos de pagamento, contas em aberto). Use para perguntas tipo "como foi hoje?", "quanto entrou hoje?".',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Data ISO (YYYY-MM-DD). Padrão = hoje.',
              },
            },
          },
        },
      },
      exec: async (args, ctx) => {
        return this.reports.daily(ctx.companyId, args?.date ? new Date(args.date) : undefined);
      },
    },

    getWeeklySummary: {
      kind: 'read',
      schema: {
        type: 'function',
        function: {
          name: 'getWeeklySummary',
          description: 'Resumo da semana (vendas, recebido, pago, top clientes/produtos).',
          parameters: { type: 'object', properties: {} },
        },
      },
      exec: async (_args, ctx) => this.reports.weekly(ctx.companyId),
    },

    getAlerts: {
      kind: 'read',
      schema: {
        type: 'function',
        function: {
          name: 'getAlerts',
          description:
            'Alertas críticos: contas vencidas, contas vencendo nos próximos 3 dias e produtos com estoque baixo.',
          parameters: { type: 'object', properties: {} },
        },
      },
      exec: async (_args, ctx) => this.reports.alerts(ctx.companyId),
    },

    searchProducts: {
      kind: 'read',
      schema: {
        type: 'function',
        function: {
          name: 'searchProducts',
          description: 'Busca produtos pelo nome (case-insensitive). Retorna nome, qtd e preço.',
          parameters: {
            type: 'object',
            required: ['query'],
            properties: {
              query: { type: 'string', description: 'Termo de busca' },
              limit: { type: 'number', description: 'Máx 50, padrão 10' },
            },
          },
        },
      },
      exec: async (args, ctx) => {
        const limit = Math.min(args.limit ?? 10, 50);
        const rows = await this.prisma.product.findMany({
          where: {
            companyId: ctx.companyId,
            deletedAt: null,
            nameProduct: { contains: args.query, mode: 'insensitive' },
          },
          take: limit,
          select: {
            id: true,
            nameProduct: true,
            quantity: true,
            costPrice: true,
            salePrice: true,
            unit: true,
          },
        });
        return rows.map((r) => ({
          ...r,
          costPrice: Number(r.costPrice),
          salePrice: Number(r.salePrice),
        }));
      },
    },

    searchCustomers: {
      kind: 'read',
      schema: {
        type: 'function',
        function: {
          name: 'searchCustomers',
          description: 'Busca clientes pelo nome ou documento.',
          parameters: {
            type: 'object',
            required: ['query'],
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' },
            },
          },
        },
      },
      exec: async (args, ctx) => {
        const limit = Math.min(args.limit ?? 10, 50);
        const rows = await this.prisma.customer.findMany({
          where: {
            companyId: ctx.companyId,
            OR: [
              { name: { contains: args.query, mode: 'insensitive' } },
              { document: { contains: args.query } },
            ],
          },
          take: limit,
          select: { id: true, name: true, document: true, phone: true, email: true },
        });
        return rows;
      },
    },

    listPendingReceivables: {
      kind: 'read',
      schema: {
        type: 'function',
        function: {
          name: 'listPendingReceivables',
          description: 'Lista contas a receber pendentes/vencidas.',
          parameters: {
            type: 'object',
            properties: {
              onlyOverdue: { type: 'boolean' },
              limit: { type: 'number' },
            },
          },
        },
      },
      exec: async (args, ctx) => {
        const today = new Date();
        const rows = await this.prisma.accountReceivable.findMany({
          where: {
            companyId: ctx.companyId,
            ...(args.onlyOverdue
              ? { status: { in: ['PENDING', 'OVERDUE'] }, dueDate: { lt: today } }
              : { status: { in: ['PENDING', 'OVERDUE'] } }),
          },
          include: { customer: { select: { name: true } } },
          orderBy: { dueDate: 'asc' },
          take: Math.min(args.limit ?? 20, 50),
        });
        return rows.map((r) => ({
          id: r.id,
          customer: r.customer?.name,
          description: r.description,
          amount: Number(r.amount),
          dueDate: r.dueDate,
          status: r.status,
        }));
      },
    },

    // ---------- WRITE (sempre passam por confirmação) ----------

    createAccountPayable: {
      kind: 'write',
      schema: {
        type: 'function',
        function: {
          name: 'createAccountPayable',
          description:
            'Cria uma conta a pagar (depois da confirmação do usuário). Use para "criar conta de X reais para Y".',
          parameters: {
            type: 'object',
            required: ['supplierName', 'description', 'amount', 'dueDate'],
            properties: {
              supplierName: { type: 'string' },
              description: { type: 'string' },
              amount: { type: 'number' },
              dueDate: { type: 'string', description: 'YYYY-MM-DD' },
              notes: { type: 'string' },
            },
          },
        },
      },
      describe: (args) =>
        `Criar conta a pagar para "${args.supplierName}" — ${args.description} — R$ ${Number(args.amount).toFixed(2)} (venc. ${args.dueDate})`,
      exec: async (args, ctx) =>
        this.prisma.accountPayable.create({
          data: {
            companyId: ctx.companyId,
            supplierName: args.supplierName,
            description: args.description,
            amount: args.amount,
            dueDate: new Date(args.dueDate),
            status: 'PENDING',
            notes: args.notes ?? null,
            interestRate: 0.033,
          },
        }),
    },

    markReceivableAsPaid: {
      kind: 'write',
      schema: {
        type: 'function',
        function: {
          name: 'markReceivableAsPaid',
          description:
            'Marca uma conta a receber como paga e cria o movimento financeiro. Requer confirmação.',
          parameters: {
            type: 'object',
            required: ['receivableId'],
            properties: {
              receivableId: { type: 'string' },
              paymentMethod: {
                type: 'string',
                enum: [
                  'CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD',
                  'BANK_TRANSFER', 'BANK_SLIP', 'CHECK', 'OTHER',
                ],
              },
              bankId: { type: 'string' },
              paidAt: { type: 'string', description: 'YYYY-MM-DD; padrão = hoje' },
            },
          },
        },
      },
      describe: (args) =>
        `Marcar conta a receber ${args.receivableId.slice(0, 8)}… como PAGA${args.paymentMethod ? ` (${args.paymentMethod})` : ''}`,
      exec: async (args, ctx) => {
        // Defesa contra IDOR: confirma que a conta pertence ao tenant do user
        const found = await this.prisma.accountReceivable.findFirst({
          where: { id: args.receivableId, companyId: ctx.companyId },
          select: { id: true },
        });
        if (!found) throw new BadRequestException('Conta a receber não encontrada.');

        return this.prisma.accountReceivable.update({
          where: { id: args.receivableId },
          data: {
            status: 'PAID',
            paidAt: args.paidAt ? new Date(args.paidAt) : new Date(),
          },
        }).then(async (updated) => {
          // O auto-CashMovement do AccountReceivableUseCases não roda aqui,
          // pois passei por baixo. Faço inline:
          const already = await this.prisma.cashMovement.findFirst({
            where: { accountReceivableId: updated.id },
          });
          if (!already) {
            const ar = await this.prisma.accountReceivable.findUnique({
              where: { id: updated.id },
              include: { customer: true },
            });
            await this.prisma.cashMovement.create({
              data: {
                companyId: ctx.companyId,
                type: 'ENTRY',
                category: 'SALE',
                value: ar!.amount,
                description: `Recebimento — ${ar!.description} (via IA)`,
                user_id: ctx.userId,
                typePayment: (args.paymentMethod ?? 'OTHER') as any,
                bankId: args.bankId ?? null,
                status: 'COMPLETED',
                referenceCode: `AR-${updated.id.slice(0, 8)}`,
                counterpartyName: ar!.customer?.name ?? null,
                accountReceivableId: updated.id,
                customerId: ar!.customerId,
                paidAt: ar!.paidAt ?? new Date(),
                date: ar!.paidAt ?? new Date(),
              },
            });
          }
          return updated;
        });
      },
    },

    productionEntry: {
      kind: 'write',
      schema: {
        type: 'function',
        function: {
          name: 'productionEntry',
          description:
            'Adiciona produção de um produto ao estoque (ex: "Galego produziu 16 manilhas"). Requer confirmação.',
          parameters: {
            type: 'object',
            required: ['productId', 'quantity'],
            properties: {
              productId: { type: 'string' },
              quantity: { type: 'number' },
              notes: { type: 'string' },
            },
          },
        },
      },
      describe: (args) =>
        `Lançar +${args.quantity} unidade(s) no estoque do produto ${args.productId.slice(0, 8)}…`,
      exec: async (args, ctx) => {
        const p = await this.prisma.product.findFirst({
          where: { id: args.productId, companyId: ctx.companyId },
        });
        if (!p) throw new BadRequestException('Produto não encontrado.');
        const next = p.quantity + Number(args.quantity);
        return this.prisma.product.update({
          where: { id: args.productId },
          data: { quantity: next },
        });
      },
    },
  };
}
