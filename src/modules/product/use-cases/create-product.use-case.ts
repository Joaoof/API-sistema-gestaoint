import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ProductKind, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { R2Service } from '../../../infra/services/r2/r2.service';
import { CreateProductInput } from '../dto/create-product.input';
import { ProductEntity } from '../entities/product.entity';

@Injectable()
export class CreateProductUseCase {
  private readonly logger = new Logger(CreateProductUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  async execute(
    input: CreateProductInput,
    createdById?: string,
  ): Promise<ProductEntity> {
    // Garante exatamente uma capa (ou primeira ordem)
    const images = (input.images ?? []).map((img, idx) => ({
      ...img,
      isPrimary: idx === 0 ? true : false,
      order: idx,
    }));

    // Itens não-físicos (SERVICE/LABOR) não usam controle de estoque.
    const isStockless = input.kind !== ProductKind.PRODUCT;
    const unit =
      input.unit && input.unit.trim().length > 0
        ? input.unit
        : input.kind === ProductKind.LABOR
          ? 'HORA'
          : input.kind === ProductKind.SERVICE
            ? 'SERV'
            : 'UN';

    try {
      const product = await this.prisma.product.create({
        data: {
          kind: input.kind,
          sku: input.sku ?? null,
          nameProduct: input.nameProduct,
          unit,
          costPrice: input.costPrice,
          salePrice: input.salePrice,
          quantity: isStockless ? 0 : input.quantity,
          minStock: isStockless ? 0 : input.minStock,
          weight: input.weight ?? null,
          categoryId: input.categoryId ?? null,
          supplierId: input.supplierId ?? null,
          description: input.description ?? null,
          status: input.active ? ProductStatus.ACTIVE : ProductStatus.INACTIVE,
          createdById: createdById ?? null,
          images: { create: images },
        },
        include: { images: { orderBy: { order: 'asc' } } },
      });

      return product as unknown as ProductEntity;
    } catch (err: unknown) {
      // Em caso de falha persistente, tenta remover imagens órfãs do R2
      if (images.length) {
        for (const img of images) {
          this.r2.delete(img.key).catch(() =>
            this.logger.warn(`Falha ao remover órfão ${img.key}`),
          );
        }
      }

      const isUniqueViolation =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002';
      if (isUniqueViolation) {
        throw new ConflictException(
          'Já existe um produto com este SKU ou nome.',
        );
      }
      throw err;
    }
  }
}
