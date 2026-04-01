/* eslint-disable no-unused-vars */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { Sale, SaleItem } from '../../../../core/entities/sales/sale.entity';
import { SaleRepository } from '../../../../core/ports/sales/sale.repository';

@Injectable()
export class PrismaSaleRepository implements SaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    sellerId: string;
    totalAmount: number;
    commissionAmount: number;
    pointsEarned: number;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }): Promise<Sale> {
    const created = await this.prisma.sale.create({
      data: {
        sellerId: input.sellerId,
        totalAmount: input.totalAmount,
        commissionAmount: input.commissionAmount,
        pointsEarned: input.pointsEarned,
        items: {
          createMany: {
            data: input.items,
          },
        },
      },
      include: { items: true },
    });

    return new Sale(
      created.id,
      created.sellerId,
      Number(created.totalAmount),
      Number(created.commissionAmount),
      created.pointsEarned,
      created.createdAt,
      created.items.map(
        (item) =>
          new SaleItem(
            item.id,
            item.productId,
            item.quantity,
            Number(item.unitPrice),
            Number(item.totalPrice),
          ),
      ),
    );
  }

  async findAll(): Promise<Sale[]> {
    const sales = await this.prisma.sale.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return sales.map(
      (sale) =>
        new Sale(
          sale.id,
          sale.sellerId,
          Number(sale.totalAmount),
          Number(sale.commissionAmount),
          sale.pointsEarned,
          sale.createdAt,
          sale.items.map(
            (item) =>
              new SaleItem(
                item.id,
                item.productId,
                item.quantity,
                Number(item.unitPrice),
                Number(item.totalPrice),
              ),
          ),
        ),
    );
  }
}
