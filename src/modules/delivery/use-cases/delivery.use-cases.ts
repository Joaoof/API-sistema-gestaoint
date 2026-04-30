import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateDeliveryInput, UpdateDeliveryInput } from '../dto/delivery.input';
import { DeliveryEntity } from '../entities/delivery.entity';

type RawDelivery = Prisma.DeliveryGetPayload<{
  include: { order: { include: { customer: true; items: true } } };
}>;

function toEntity(raw: RawDelivery): DeliveryEntity {
  return {
    id: raw.id,
    orderId: raw.orderId,
    driver: raw.driver,
    vehicle: raw.vehicle,
    destination: raw.destination,
    scheduledDate: raw.scheduledDate,
    startedAt: raw.startedAt,
    deliveredAt: raw.deliveredAt,
    status: raw.status,
    notes: raw.notes,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    order: raw.order
      ? ({
          id: raw.order.id,
          number: raw.order.number,
          customerId: raw.order.customerId,
          customerName: raw.order.customerName,
          status: raw.order.status,
          paymentMethod: raw.order.paymentMethod,
          subtotal: Number(raw.order.subtotal),
          discount: Number(raw.order.discount),
          total: Number(raw.order.total),
          notes: raw.order.notes,
          createdAt: raw.order.createdAt,
          updatedAt: raw.order.updatedAt,
          customer: raw.order.customer as any,
          items: raw.order.items.map((i) => ({
            id: i.id,
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            discount: Number(i.discount),
            total: Number(i.total),
          })),
        } as any)
      : null,
  };
}

@Injectable()
export class DeliveryUseCases {
  constructor(private readonly prisma: PrismaService) {}

  async list(args: { status?: DeliveryStatus; search?: string } = {}): Promise<DeliveryEntity[]> {
    const records = await this.prisma.delivery.findMany({
      where: {
        ...(args.status ? { status: args.status } : {}),
        ...(args.search
          ? {
              OR: [
                { driver: { contains: args.search, mode: 'insensitive' } },
                { destination: { contains: args.search, mode: 'insensitive' } },
                {
                  order: {
                    OR: [
                      { customerName: { contains: args.search, mode: 'insensitive' } },
                      { customer: { name: { contains: args.search, mode: 'insensitive' } } },
                    ],
                  },
                },
              ],
            }
          : {}),
      },
      include: { order: { include: { customer: true, items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return records.map(toEntity);
  }

  async findById(id: string): Promise<DeliveryEntity> {
    const record = await this.prisma.delivery.findUnique({
      where: { id },
      include: { order: { include: { customer: true, items: true } } },
    });
    if (!record) throw new NotFoundException('Entrega não encontrada.');
    return toEntity(record);
  }

  async create(input: CreateDeliveryInput): Promise<DeliveryEntity> {
    const order = await this.prisma.order.findUnique({ where: { id: input.orderId } });
    if (!order) throw new NotFoundException('Pedido não encontrado.');

    const existing = await this.prisma.delivery.findUnique({ where: { orderId: input.orderId } });
    if (existing) throw new BadRequestException('Este pedido já tem uma entrega vinculada.');

    const created = await this.prisma.delivery.create({
      data: {
        orderId: input.orderId,
        driver: input.driver ?? null,
        vehicle: input.vehicle ?? null,
        destination: input.destination ?? null,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        notes: input.notes ?? null,
      },
      include: { order: { include: { customer: true, items: true } } },
    });
    return toEntity(created);
  }

  async update(input: UpdateDeliveryInput): Promise<DeliveryEntity> {
    const existing = await this.prisma.delivery.findUnique({ where: { id: input.id } });
    if (!existing) throw new NotFoundException('Entrega não encontrada.');

    const data: Prisma.DeliveryUpdateInput = {};
    if (input.driver !== undefined) data.driver = input.driver;
    if (input.vehicle !== undefined) data.vehicle = input.vehicle;
    if (input.destination !== undefined) data.destination = input.destination;
    if (input.scheduledDate !== undefined)
      data.scheduledDate = input.scheduledDate ? new Date(input.scheduledDate) : null;
    if (input.notes !== undefined) data.notes = input.notes;

    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === DeliveryStatus.IN_TRANSIT && !existing.startedAt) {
        data.startedAt = new Date();
      }
      if (input.status === DeliveryStatus.DELIVERED && !existing.deliveredAt) {
        data.deliveredAt = new Date();
      }
    }

    const updated = await this.prisma.delivery.update({
      where: { id: input.id },
      data,
      include: { order: { include: { customer: true, items: true } } },
    });
    return toEntity(updated);
  }

  async complete(id: string, notes?: string): Promise<DeliveryEntity> {
    const existing = await this.prisma.delivery.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Entrega não encontrada.');
    if (existing.status === DeliveryStatus.DELIVERED) {
      throw new BadRequestException('Esta entrega já foi concluída.');
    }
    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        ...(existing.startedAt ? {} : { startedAt: new Date() }),
        ...(notes ? { notes } : {}),
      },
      include: { order: { include: { customer: true, items: true } } },
    });
    return toEntity(updated);
  }

  async cancel(id: string): Promise<DeliveryEntity> {
    const existing = await this.prisma.delivery.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Entrega não encontrada.');
    const updated = await this.prisma.delivery.update({
      where: { id },
      data: { status: DeliveryStatus.CANCELED },
      include: { order: { include: { customer: true, items: true } } },
    });
    return toEntity(updated);
  }

  async deliverableOrders(): Promise<{ id: string; number: number; customerName: string | null; total: number; createdAt: Date }[]> {
    // Pedidos confirmados/pagos ainda sem entrega
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PAID'] },
        delivery: null,
      },
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
      take: 200,
    });
    return orders.map((o) => ({
      id: o.id,
      number: o.number,
      customerName: o.customer?.name ?? o.customerName ?? null,
      total: Number(o.total),
      createdAt: o.createdAt,
    }));
  }

  async summary(): Promise<{
    pending: number;
    inTransit: number;
    delivered: number;
    canceled: number;
    todayDelivered: number;
  }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [pending, inTransit, delivered, canceled, todayDelivered] = await Promise.all([
      this.prisma.delivery.count({ where: { status: DeliveryStatus.PENDING } }),
      this.prisma.delivery.count({ where: { status: DeliveryStatus.IN_TRANSIT } }),
      this.prisma.delivery.count({ where: { status: DeliveryStatus.DELIVERED } }),
      this.prisma.delivery.count({ where: { status: DeliveryStatus.CANCELED } }),
      this.prisma.delivery.count({
        where: { status: DeliveryStatus.DELIVERED, deliveredAt: { gte: startOfDay } },
      }),
    ]);

    return { pending, inTransit, delivered, canceled, todayDelivered };
  }
}
