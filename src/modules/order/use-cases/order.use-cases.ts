import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateOrderInput } from '../dto/create-order.input';
import { OrderEntity } from '../entities/order.entity';

type RawOrder = Prisma.OrderGetPayload<{
  include: { customer: true; items: true };
}>;

function toEntity(raw: RawOrder): OrderEntity {
  return {
    id: raw.id,
    number: raw.number,
    customerId: raw.customerId,
    customerName: raw.customerName,
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

    // Transação: cria pedido + baixa estoque
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerId: input.customerId ?? null,
          customerName: input.customerName ?? null,
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
