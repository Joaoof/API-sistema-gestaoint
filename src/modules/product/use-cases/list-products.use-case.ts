import { Injectable } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ProductEntity } from '../entities/product.entity';

export interface ListProductsArgs {
  status?: ProductStatus;
  search?: string;
  categoryId?: string;
  take?: number;
  skip?: number;
}

@Injectable()
export class ListProductsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async findById(companyId: string, id: string): Promise<ProductEntity | null> {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { images: { orderBy: { order: 'asc' } } },
    });
    return (product as unknown as ProductEntity) ?? null;
  }

  async execute(companyId: string, args: ListProductsArgs = {}): Promise<ProductEntity[]> {
    const { status, search, categoryId, take = 50, skip = 0 } = args;

    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              OR: [
                { nameProduct: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { images: { orderBy: { order: 'asc' } } },
      take: Math.min(take, 200),
      skip,
    });

    return products as unknown as ProductEntity[];
  }
}
