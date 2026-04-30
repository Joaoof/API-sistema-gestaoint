import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderPaymentMethod, OrderStatus, Prisma } from '@prisma/client';
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
    subtotal: Number(raw.subtotal),
    discount: Number(raw.discount),
    total: Number(raw.total),
    notes: raw.notes,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    customer: raw.customer as any,
    items: raw.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount),
      total: Number(i.total),
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

    // Carrega produtos com nome e estoque atual
    const productIds = input.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Valida estoque e calcula totais
    const itemsToCreate: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Produto ${item.productId} não encontrado.`);
      }
      if (product.quantity < item.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para "${product.nameProduct}". Disponível: ${product.quantity}, solicitado: ${item.quantity}.`,
        );
      }
      const lineTotal = Number(
        (item.unitPrice * item.quantity - item.discount).toFixed(2),
      );
      subtotal += lineTotal;
      itemsToCreate.push({
        productName: product.nameProduct,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: lineTotal,
        product: { connect: { id: product.id } },
      });
    }

    const total = Number((subtotal - input.discount).toFixed(2));
    if (total < 0) {
      throw new BadRequestException('Desconto maior que o subtotal.');
    }

    // Resolve cliente (snapshot de nome/documento/telefone)
    let customerName: string | null = input.customerName ?? null;
    let customerDocument: string | null = input.customerDocument ?? null;
    let customerPhone: string | null = input.customerPhone ?? null;
    if (input.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
      if (!customer) throw new BadRequestException('Cliente não encontrado.');
      customerName = customerName ?? customer.name;
      customerDocument = customerDocument ?? customer.document;
      customerPhone = customerPhone ?? customer.phone;
    }

    // Resolve vendedor (snapshot de nome + cálculo de comissão)
    let sellerId: string | null = null;
    let sellerName: string | null = null;
    let commissionPercent = 0;
    let commissionAmount = 0;
    if (input.sellerId) {
      const seller = await this.prisma.seller.findUnique({ where: { id: input.sellerId } });
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

    // Transação: cria pedido + baixa estoque + acumula comissão do vendedor
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
          status: input.status,
          paymentMethod: input.paymentMethod,
          subtotal,
          discount: input.discount,
          total,
          notes: input.notes ?? null,
          createdById: createdById ?? null,
          items: { create: itemsToCreate },
        },
        include: { customer: true, items: true },
      });

      // Baixa de estoque (somente se pedido for confirmado/pago)
      if (
        input.status === OrderStatus.CONFIRMED ||
        input.status === OrderStatus.PAID
      ) {
        for (const item of input.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      // Acumula totalCommission do vendedor quando o pedido conta como faturado
      if (
        sellerId &&
        commissionAmount > 0 &&
        (input.status === OrderStatus.CONFIRMED || input.status === OrderStatus.PAID)
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
      // Devolve estoque se o pedido estava ativo
      if (
        order.status === OrderStatus.CONFIRMED ||
        order.status === OrderStatus.PAID
      ) {
        for (const item of order.items) {
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

    return {
      empresa: {
        nome_fantasia: company?.nomeFantasia ?? company?.name ?? null,
        razao_social: company?.razaoSocial ?? null,
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
        vencimento: order.dueDate ? order.dueDate.toISOString().slice(0, 10) : null,
        valor_total: Number(order.total),
        valor_bruto: Number(order.subtotal),
        desconto: Number(order.discount),
        itens_qtd: order.items.length,
      },
      itens: order.items.map((i) => ({
        codigo: i.product?.sku ?? null,
        descricao: i.productName,
        marca: null,
        unidade: i.product?.unit ?? 'UN',
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
