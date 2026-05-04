import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  OrderPaymentMethod,
  OrderStatus,
  OrderType,
  Prisma,
  ProductKind,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
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

@Injectable()
export class OrderUseCases {
  constructor(private readonly prisma: PrismaService) {}

  async list(args: { search?: string; status?: OrderStatus; take?: number } = {}): Promise<OrderEntity[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        ...(args.status ? { status: args.status } : {}),
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
      take: Math.min(args.take ?? 50, 200),
    });
    return orders.map(toEntity);
  }

  async findById(id: string): Promise<OrderEntity> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return toEntity(order);
  }

  async create(input: CreateOrderInput, createdById?: string): Promise<OrderEntity> {
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
    const productIds = input.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Valida estoque (apenas para PRODUCT em pedidos STANDARD) e calcula totais.
    const itemsToCreate: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    const stockMovements: Array<{ productId: string; quantity: number }> = [];
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
        stockMovements.push({ productId: product.id, quantity });
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
      const customer = await this.prisma.customer.findUnique({
        where: { id: input.customerId },
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
          createdById: createdById ?? null,
          items: { create: itemsToCreate },
        },
        include: { customer: true, items: true },
      });

      // Baixa de estoque (somente PRODUCT em STANDARD CONFIRMED/PAID).
      if (
        finalStatus === OrderStatus.CONFIRMED ||
        finalStatus === OrderStatus.PAID
      ) {
        for (const move of stockMovements) {
          await tx.product.update({
            where: { id: move.productId },
            data: { quantity: { decrement: move.quantity } },
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

      return created;
    });

    return toEntity(order);
  }

  async cancel(id: string): Promise<OrderEntity> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
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
      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELED },
        include: { customer: true, items: true },
      });
    });

    return toEntity(updated);
  }

  async remove(id: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
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
    });

    return true;
  }

  async findForPrint(id: string): Promise<OrderPrintDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
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

  async summary(): Promise<{
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
          createdAt: { gte: startOfDay },
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PAID] },
        },
      }),
      this.prisma.order.findMany({
        where: {
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
}
