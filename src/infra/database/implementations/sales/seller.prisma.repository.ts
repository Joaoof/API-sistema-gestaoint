/* eslint-disable no-unused-vars */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { Seller } from '../../../../core/entities/sales/seller.entity';
import { SellerRepository } from '../../../../core/ports/sales/seller.repository';

@Injectable()
export class PrismaSellerRepository implements SellerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: { name: string; email: string }): Promise<Seller> {
    const created = await this.prisma.seller.create({ data: input });
    return new Seller(
      created.id,
      created.name,
      created.email,
      created.active,
      Number(created.totalCommission),
      created.totalPoints,
      created.createdAt,
      created.updatedAt,
    );
  }

  async findById(id: string): Promise<Seller | null> {
    const seller = await this.prisma.seller.findUnique({ where: { id } });
    if (!seller) {
      return null;
    }

    return new Seller(
      seller.id,
      seller.name,
      seller.email,
      seller.active,
      Number(seller.totalCommission),
      seller.totalPoints,
      seller.createdAt,
      seller.updatedAt,
    );
  }

  async findAll(): Promise<Seller[]> {
    const sellers = await this.prisma.seller.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return sellers.map(
      (seller) =>
        new Seller(
          seller.id,
          seller.name,
          seller.email,
          seller.active,
          Number(seller.totalCommission),
          seller.totalPoints,
          seller.createdAt,
          seller.updatedAt,
        ),
    );
  }

  async addPerformance(input: {
    sellerId: string;
    commissionToAdd: number;
    pointsToAdd: number;
  }): Promise<void> {
    await this.prisma.seller.update({
      where: { id: input.sellerId },
      data: {
        totalCommission: { increment: input.commissionToAdd },
        totalPoints: { increment: input.pointsToAdd },
      },
    });
  }
}
