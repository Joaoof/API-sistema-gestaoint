import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  OrderPaymentMethod,
  OrderStatus,
  OrderType,
  Prisma,
  ProductKind,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { InventoryService } from '../../warehouse/use-cases/inventory.service';
import { CreateOrderInput } from '../dto/create-order.input';
import { OrderEntity } from '../entities/order.entity';
import { OrderPrintDto } from '../dto/order-print.dto';

const PAYMENT_METHOD_LABEL: Record<OrderPaymentMethod, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  BOLETO: 'Boleto',
  TRANSFER: 'Transferência',
  OTHER: 'Outro',
};

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  STANDARD: 'Pronta-entrega',
  CUSTOM_ORDER: 'Encomenda',
};

const ITEM_KIND_LABEL: Record<ProductKind, string> = {
  PRODUCT: 'Produto',
  SERVICE: 'Serviço',
  LABOR: 'Mão de obra',
};

type RawOrder = Prisma.OrderGetPayload<{
  include: { customer: true; items: true };
}>;

function toEntity(raw: RawOrder): OrderEntity {
  return {
    id: raw.id,
    number: raw.number,
    customerId: raw.customerId,
    customerName: raw.customerName,
    customerDocument: raw.customerDocument,
    customerPhone: raw.customerPhone,
    sellerId: raw.sellerId,
    sellerName: raw.sellerName,
    commissionPercent: Number(raw.commissionPercent),
    commissionAmount: Number(raw.commissionAmount),
    status: raw.status,
    paymentMethod: raw.paymentMethod,
    orderType: raw.orderType,
    expectedDeliveryDate: raw.expectedDeliveryDate,
    depositAmount: Number(raw.depositAmount),
    subtotal: Number(raw.subtotal),
    discount: Number(raw.discount),
    total: Number(raw.total),
    notes: raw.notes,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    customer: raw.customer as never,
    items: raw.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      itemKind: i.itemKind,
      itemUnit: i.itemUnit,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount),
      total: Number(i.total),
      description: i.description,
    })),
  };
}

function toAuditSnapshot(raw: RawOrder): Record<string, unknown> {
  return {
    ...raw,
    commissionPercent: Number(raw.commissionPercent),
    commissionAmount: Number(raw.commissionAmount),
    depositAmount: Number(raw.depositAmount),
    subtotal: Number(raw.subtotal),
    discount: Number(raw.discount),
    total: Number(raw.total),
    items: raw.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount),
      total: Number(i.total),
    })),
  };
}

@Injectable()
export class OrderUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly inventory: InventoryService,
  ) {}

  async list(
    companyId: string,
    args: {
      search?: string;
      status?: OrderStatus;
      take?: number;
      fromDate?: Date;
      toDate?: Date;
    } = {},
  ): Promise<OrderEntity[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        ...(args.status ? { status: args.status } : {}),
        ...(args.fromDate || args.toDate
          ? {
              createdAt: {
                ...(args.fromDate ? { gte: args.fromDate } : {}),
                ...(args.toDate ? { lte: args.toDate } : {}),
              },
            }
          : {}),
        ...(args.search
          ? {
              OR: [
                { customerName: { contains: args.search, mode: 'insensitive' } },
                { customer: { name: { contains: args.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
      // Cap aumentado de 200 → 1000 e default de 50 → 500 pra cobrir mês
      // inteiro de operação no relatório (eventualmente migrar pra paginação).
      take: Math.min(args.take ?? 500, 1000),
    });
    return orders.map(toEntity);
  }

  async findById(companyId: string, id: string): Promise<OrderEntity> {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId },
      include: { customer: true, items: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return toEntity(order);
  }

  async create(actor: AuditActor, input: CreateOrderInput): Promise<OrderEntity> {
    if (input.items.length === 0) {
      throw new BadRequestException('Pelo menos um item é obrigatório.');
    }

    const isCustomOrder = input.orderType === OrderType.CUSTOM_ORDER;

    if (isCustomOrder && !input.expectedDeliveryDate) {
      throw new BadRequestException(
        'Encomendas exigem uma data de entrega prevista.',
      );
    }

    // Carrega produtos com kind/unit/estoque atual.
    // Tenant-scoped: só produtos da empresa do usuário podem entrar no pedido.
    const productIds = input.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId: actor.companyId, deletedAt: null },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Valida estoque (apenas para PRODUCT em pedidos STANDARD) e calcula totais.
    // A baixa real é feita via InventoryService.exitInTx (multi-warehouse).
    const itemsToCreate: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    const stockMovements: Array<{ productId: string; quantity: number; productName: string }> = [];
    let subtotal = 0;

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Produto ${item.productId} não encontrado.`);
      }

      const isStockless = product.kind !== ProductKind.PRODUCT;

      // Mão de obra / serviço: quantidade sempre 1.
      const quantity = isStockless ? 1 : item.quantity;

      // Valida estoque apenas para itens físicos em pedido STANDARD.
      if (!isStockless && !isCustomOrder && product.quantity < quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para "${product.nameProduct}". Disponível: ${product.quantity}, solicitado: ${quantity}.`,
        );
      }

      const lineTotal = Number(
        (item.unitPrice * quantity - item.discount).toFixed(2),
      );
      if (lineTotal < 0) {
        throw new BadRequestException(
          `Desconto do item "${product.nameProduct}" maior que o subtotal.`,
        );
      }
      subtotal += lineTotal;

      itemsToCreate.push({
        productName: product.nameProduct,
        itemKind: product.kind,
        itemUnit: product.unit,
        quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: lineTotal,
        description: item.description ?? null,
        product: { connect: { id: product.id } },
      });

      // Estoque só é decrementado para PRODUCT em pedidos STANDARD.
      if (!isStockless && !isCustomOrder) {
        stockMovements.push({ productId: product.id, quantity, productName: product.nameProduct });
      }
    }

    const total = Number((subtotal - input.discount).toFixed(2));
    if (total < 0) {
      throw new BadRequestException('Desconto maior que o subtotal.');
    }

    if (input.depositAmount > total) {
      throw new BadRequestException(
        'Sinal/entrada não pode ser maior que o total do pedido.',
      );
    }

    // Resolve cliente (snapshot de nome/documento/telefone).
    let customerName: string | null = input.customerName ?? null;
    let customerDocument: string | null = input.customerDocument ?? null;
    let customerPhone: string | null = input.customerPhone ?? null;
    if (input.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: input.customerId, companyId: actor.companyId },
      });
      if (!customer) throw new BadRequestException('Cliente não encontrado.');
      customerName = customerName ?? customer.name;
      customerDocument = customerDocument ?? customer.document;
      customerPhone = customerPhone ?? customer.phone;
    }

    if (isCustomOrder && !customerName) {
      throw new BadRequestException(
        'Encomendas exigem identificação do cliente (nome ou cliente cadastrado).',
      );
    }

    // Resolve vendedor (snapshot de nome + cálculo de comissão).
    let sellerId: string | null = null;
    let sellerName: string | null = null;
    let commissionPercent = 0;
    let commissionAmount = 0;
    if (input.sellerId) {
      // Seller ainda não tem companyId nesta fase — fica pra próxima rodada.
      const seller = await this.prisma.seller.findUnique({
        where: { id: input.sellerId },
      });
      if (!seller) throw new BadRequestException('Vendedor não encontrado.');
      if (!seller.active) throw new BadRequestException('Vendedor inativo.');
      sellerId = seller.id;
      sellerName = seller.name;
      commissionPercent =
        input.commissionPercent !== undefined && input.commissionPercent !== null
          ? input.commissionPercent
          : Number(seller.commissionPercent);
      commissionAmount = Number(((total * commissionPercent) / 100).toFixed(2));
    }

    // Encomendas iniciam DRAFT; o caller pode forçar outro status, mas
    // mantemos a regra: quando vira CUSTOM_ORDER e foi enviado CONFIRMED/PAID,
    // respeitamos o pedido — apenas não baixamos estoque.
    const finalStatus = input.status;

    // Transação: cria pedido + (eventual) baixa estoque + acumula comissão.
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          companyId: actor.companyId,
          customerId: input.customerId ?? null,
          customerName,
          customerDocument,
          customerPhone,
          sellerId,
          sellerName,
          commissionPercent,
          commissionAmount,
          status: finalStatus,
          paymentMethod: input.paymentMethod,
          orderType: input.orderType,
          expectedDeliveryDate: input.expectedDeliveryDate ?? null,
          depositAmount: input.depositAmount,
          subtotal,
          discount: input.discount,
          total,
          notes: input.notes ?? null,
          createdById: actor.userId,
          items: { create: itemsToCreate },
        },
        include: { customer: true, items: true },
      });

      // Baixa de estoque (somente PRODUCT em STANDARD CONFIRMED/PAID).
      if (
        finalStatus === OrderStatus.CONFIRMED ||
        finalStatus === OrderStatus.PAID
      ) {
        // Baixa estoque via InventoryService.exitInTx — registra
        // InventoryMovement e usa o depósito principal por padrão.
        for (const move of stockMovements) {
          await this.inventory.exitInTx(tx, { userId: actor.userId!, companyId: actor.companyId }, {
            productId: move.productId,
            quantity: move.quantity,
            reason: `Venda — Pedido #${created.number}`,
            reference: created.id,
          });
        }
      }

      // Acumula comissão do vendedor para pedidos faturados.
      if (
        sellerId &&
        commissionAmount > 0 &&
        (finalStatus === OrderStatus.CONFIRMED || finalStatus === OrderStatus.PAID)
      ) {
        await tx.seller.update({
          where: { id: sellerId },
          data: { totalCommission: { increment: commissionAmount } },
        });
      }

      // Auto-cria conta a receber pelo saldo restante.
      // Regra: status CONFIRMED + tem customer + saldo > 0 + paymentMethod
      // não-CASH (CASH presume recebimento imediato → vai como CashMovement).
      const balance = Number((total - Number(input.depositAmount ?? 0)).toFixed(2));
      const shouldCreateAR =
        finalStatus === OrderStatus.CONFIRMED &&
        !!input.customerId &&
        balance > 0 &&
        input.paymentMethod !== OrderPaymentMethod.CASH;
      if (shouldCreateAR) {
        const dueDate =
          input.expectedDeliveryDate ??
          new Date(Date.now() + 30 * 86400_000);
        await tx.accountReceivable.create({
          data: {
            companyId: actor.companyId,
            customerId: input.customerId!,
            orderId: created.id,
            description: `Pedido #${created.number}`,
            amount: balance,
            dueDate: new Date(dueDate),
            notes: `Auto-gerado pela venda #${created.number} (${PAYMENT_METHOD_LABEL[input.paymentMethod]})`,
          },
        });
      }

      // Se a venda já foi paga à vista (CASH + PAID), registra entrada
      // no caixa automaticamente — single source of truth.
      if (
        finalStatus === OrderStatus.PAID &&
        input.paymentMethod === OrderPaymentMethod.CASH &&
        total > 0 &&
        actor.userId
      ) {
        await tx.cashMovement.create({
          data: {
            companyId: actor.companyId,
            type: 'ENTRY',
            category: 'SALE',
            value: total,
            description: `Venda à vista — Pedido #${created.number}${customerName ? ` (${customerName})` : ''}`,
            user_id: actor.userId,
            typePayment: 'CASH',
            status: 'COMPLETED',
            referenceCode: `ORDER-${created.number}`,
            counterpartyName: customerName,
            counterpartyDocument: customerDocument,
            orderId: created.id,
            customerId: input.customerId ?? null,
            paidAt: new Date(),
          },
        });
      }

      await this.audit.log(
        {
          companyId: actor.companyId,
          userId: actor.userId,
          entity: 'Order',
          entityId: created.id,
          action: AuditAction.CREATE,
          after: toAuditSnapshot(created),
        },
        tx,
      );

      return created;
    });

    return toEntity(order);
  }

  async cancel(actor: AuditActor, id: string): Promise<OrderEntity> {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId: actor.companyId },
      include: { customer: true, items: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('Pedido já está cancelado.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Devolve estoque apenas se pedido ativo, não for encomenda e item for físico.
      if (
        order.orderType === OrderType.STANDARD &&
        (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PAID)
      ) {
        for (const item of order.items) {
          if (item.itemKind !== ProductKind.PRODUCT) continue;
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }
      const u = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELED },
        include: { customer: true, items: true },
      });

      await this.audit.log(
        {
          companyId: actor.companyId,
          userId: actor.userId,
          entity: 'Order',
          entityId: u.id,
          action: AuditAction.REVERT,
          before: toAuditSnapshot(order),
          after: toAuditSnapshot(u),
          reason: 'Pedido cancelado.',
        },
        tx,
      );

      return u;
    });

    return toEntity(updated);
  }

  async remove(actor: AuditActor, id: string): Promise<boolean> {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId: actor.companyId },
      include: { customer: true, items: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');

    await this.prisma.$transaction(async (tx) => {
      // Devolve estoque (mesmas condições do cancel).
      if (
        order.orderType === OrderType.STANDARD &&
        (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PAID)
      ) {
        for (const item of order.items) {
          if (item.itemKind !== ProductKind.PRODUCT) continue;
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }
      // Estorna comissão acumulada do vendedor (se houver).
      if (
        order.sellerId &&
        Number(order.commissionAmount) > 0 &&
        (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PAID)
      ) {
        await tx.seller.update({
          where: { id: order.sellerId },
          data: { totalCommission: { decrement: Number(order.commissionAmount) } },
        });
      }
      await tx.delivery.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });

      await this.audit.log(
        {
          companyId: actor.companyId,
          userId: actor.userId,
          entity: 'Order',
          entityId: id,
          action: AuditAction.DELETE,
          before: toAuditSnapshot(order),
        },
        tx,
      );
    });

    return true;
  }

  async findForPrint(companyId: string, id: string): Promise<OrderPrintDto> {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        createdBy: { include: { company: true } },
        items: { include: { product: true } },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');

    const company = order.createdBy?.company ?? null;
    const createdAt = order.createdAt;
    const dataEmissao = createdAt.toISOString().slice(0, 10);
    const horaEmissao = createdAt.toISOString().slice(11, 19);

    const totalLiquido = Number(order.total);
    const entrada = Number(order.depositAmount ?? 0);
    const saldoARecolher = Number((totalLiquido - entrada).toFixed(2));

    return {
      empresa: {
        nome_fantasia: company?.nomeFantasia ?? company?.name ?? null,
        razao_social: company?.razaoSocial ?? company?.name ?? null,
        cnpj: company?.cnpj ?? null,
        inscricao_estadual: company?.inscricaoEstadual ?? null,
        endereco: company?.address ?? null,
        cidade: company?.cidade ?? null,
        estado: company?.estado ?? null,
        telefone: company?.phone ?? null,
      },
      cliente: {
        nome: order.customer?.name ?? order.customerName ?? null,
        cpf_cnpj: order.customer?.document ?? order.customerDocument ?? null,
        telefone: order.customer?.phone ?? order.customerPhone ?? null,
        bairro: order.customer?.bairro ?? null,
        cep: order.customer?.cep ?? null,
      },
      pedido: {
        numero: String(order.number),
        data_emissao: dataEmissao,
        hora_emissao: horaEmissao,
        forma_pagamento: PAYMENT_METHOD_LABEL[order.paymentMethod],
        tipo: order.orderType,
        tipo_label: ORDER_TYPE_LABEL[order.orderType],
        entrega_prevista: order.expectedDeliveryDate
          ? order.expectedDeliveryDate.toISOString().slice(0, 10)
          : null,
        entrada,
        saldo_a_pagar: saldoARecolher,
        vencimento: order.dueDate ? order.dueDate.toISOString().slice(0, 10) : null,
        valor_total: totalLiquido,
        valor_bruto: Number(order.subtotal),
        desconto: Number(order.discount),
        itens_qtd: order.items.length,
      },
      itens: order.items.map((i) => ({
        codigo: i.product?.sku ?? null,
        descricao: i.description
          ? `${i.productName} — ${i.description}`
          : i.productName,
        marca: null,
        unidade: i.itemUnit || i.product?.unit || 'UN',
        tipo: i.itemKind,
        tipo_label: ITEM_KIND_LABEL[i.itemKind],
        // Mão de obra / serviço não exibem quantidade na nota.
        mostra_quantidade: i.itemKind === ProductKind.PRODUCT,
        quantidade: i.quantity,
        valor_unitario: Number(i.unitPrice),
        desconto: Number(i.discount),
        valor_total: Number(i.total),
      })),
      vendedor: order.sellerName ?? order.createdBy?.name ?? null,
      observacoes: order.notes ?? null,
    };
  }

  async summary(companyId: string): Promise<{
    todayCount: number;
    todayTotal: number;
    monthCount: number;
    monthTotal: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, month] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          companyId,
          createdAt: { gte: startOfDay },
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PAID] },
        },
      }),
      this.prisma.order.findMany({
        where: {
          companyId,
          createdAt: { gte: startOfMonth },
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PAID] },
        },
      }),
    ]);

    return {
      todayCount: today.length,
      todayTotal: today.reduce((s, o) => s + Number(o.total), 0),
      monthCount: month.length,
      monthTotal: month.reduce((s, o) => s + Number(o.total), 0),
    };
  }

  /**
   * Atalho "recebi o pagamento" — em uma única chamada:
   *  1. Marca todos AccountReceivable pendentes do Order como PAID
   *  2. Cria (via trigger do AR.update) o CashMovement de entrada
   *  3. Atualiza o Order pra status=PAID
   *
   * Permite ao usuário não precisar passar por 3 telas (Vendas → Contas a
   * Receber → Movimentações). Aceita opcionalmente paymentMethod e bankId.
   */
  async payOrderShortcut(
    actor: AuditActor,
    orderId: string,
    options?: {
      paymentMethod?: 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'OTHER';
      bankId?: string;
      receivedAmount?: number;
    },
  ): Promise<OrderEntity> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, companyId: actor.companyId },
      include: { customer: true, items: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Pedido já está pago.');
    }
    if (order.status === OrderStatus.CANCELED) {
      throw new BadRequestException('Pedido cancelado não pode ser pago.');
    }

    const customerName = order.customerName ?? order.customer?.name ?? null;
    const movPayment = options?.paymentMethod ?? 'OTHER';

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Marca AR vinculados como pagos
      const pendingARs = await tx.accountReceivable.findMany({
        where: { orderId: order.id, status: 'PENDING' },
      });
      const now = new Date();
      for (const ar of pendingARs) {
        await tx.accountReceivable.update({
          where: { id: ar.id },
          data: { status: 'PAID', paidAt: now },
        });
      }

      // 2. Cria CashMovement de entrada (dedupe por order)
      const totalReceived =
        options?.receivedAmount ?? Number(order.total);
      const alreadyMov = await tx.cashMovement.findFirst({
        where: { orderId: order.id, accountReceivableId: null },
      });
      if (!alreadyMov && totalReceived > 0 && actor.userId) {
        await tx.cashMovement.create({
          data: {
            companyId: actor.companyId,
            type: 'ENTRY',
            category: 'SALE',
            value: totalReceived,
            description: `Recebimento — Pedido #${order.number}${customerName ? ` (${customerName})` : ''}`,
            user_id: actor.userId,
            typePayment: movPayment,
            status: 'COMPLETED',
            referenceCode: `ORDER-${order.number}`,
            counterpartyName: customerName,
            counterpartyDocument: order.customerDocument,
            orderId: order.id,
            customerId: order.customerId,
            bankId: options?.bankId ?? null,
            paidAt: now,
          },
        });
      }

      // 3. Atualiza Order pra PAID
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
        include: { customer: true, items: true },
      });

      await this.audit.log(
        {
          companyId: actor.companyId,
          userId: actor.userId,
          entity: 'Order',
          entityId: order.id,
          action: AuditAction.UPDATE,
          before: toAuditSnapshot(order),
          after: toAuditSnapshot(updatedOrder),
        },
        tx,
      );
      return updatedOrder;
    });

    return toEntity(updated);
  }
}
