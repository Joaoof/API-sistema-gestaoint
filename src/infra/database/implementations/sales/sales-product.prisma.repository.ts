/* eslint-disable no-unused-vars */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { SalesProduct } from '../../../../core/entities/sales/sales-product.entity';
import { SalesProductRepository } from '../../../../core/ports/sales/sales-product.repository';

@Injectable()
export class PrismaSalesProductRepository implements SalesProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    name: string;
    sku: string;
    unitPrice: number;
  }): Promise<SalesProduct> {
    const created = await this.prisma.salesCatalogProduct.create({
      data: {
        name: input.name,
        sku: input.sku,
        unitPrice: input.unitPrice,
      },
    });

    return new SalesProduct(
      created.id,
      created.name,
      created.sku,
      Number(created.unitPrice),
      created.active,
      created.createdAt,
      created.updatedAt,
    );
  }

  async findById(id: string): Promise<SalesProduct | null> {
    const product = await this.prisma.salesCatalogProduct.findUnique({
      where: { id },
    });
    if (!product) {
      return null;
    }

    return new SalesProduct(
      product.id,
      product.name,
      product.sku,
      Number(product.unitPrice),
      product.active,
      product.createdAt,
      product.updatedAt,
    );
  }

  async findManyByIds(ids: string[]): Promise<SalesProduct[]> {
    const products = await this.prisma.salesCatalogProduct.findMany({
      where: { id: { in: ids } },
    });
    return products.map(
      (product) =>
        new SalesProduct(
          product.id,
          product.name,
          product.sku,
          Number(product.unitPrice),
          product.active,
          product.createdAt,
          product.updatedAt,
        ),
    );
  }

  async findAll(): Promise<SalesProduct[]> {
    const products = await this.prisma.salesCatalogProduct.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return products.map(
      (product) =>
        new SalesProduct(
          product.id,
          product.name,
          product.sku,
          Number(product.unitPrice),
          product.active,
          product.createdAt,
          product.updatedAt,
        ),
    );
  }
}
