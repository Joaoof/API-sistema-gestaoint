import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { R2Service } from '../../../infra/services/r2/r2.service';
import { UpdateProductInput } from '../dto/update-product.input';
import { ProductEntity } from '../entities/product.entity';

@Injectable()
export class UpdateProductUseCase {
  private readonly logger = new Logger(UpdateProductUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  async execute(input: UpdateProductInput): Promise<ProductEntity> {
    const existing = await this.prisma.product.findFirst({
      where: { id: input.id, deletedAt: null },
      include: { images: true },
    });
    if (!existing) {
      throw new NotFoundException('Produto não encontrado.');
    }

    const data: Prisma.ProductUpdateInput = {};
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.nameProduct !== undefined) data.nameProduct = input.nameProduct;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.costPrice !== undefined) data.costPrice = input.costPrice;
    if (input.salePrice !== undefined) data.salePrice = input.salePrice;
    if (input.quantity !== undefined) data.quantity = input.quantity;
    if (input.minStock !== undefined) data.minStock = input.minStock;
    if (input.weight !== undefined) data.weight = input.weight;
    if (input.description !== undefined) data.description = input.description;
    if (input.active !== undefined) {
      data.status = input.active ? ProductStatus.ACTIVE : ProductStatus.INACTIVE;
    }
    if (input.categoryId !== undefined) {
      data.category = input.categoryId
        ? { connect: { id: input.categoryId } }
        : { disconnect: true };
    }
    if (input.supplierId !== undefined) {
      data.supplier = input.supplierId
        ? { connect: { id: input.supplierId } }
        : { disconnect: true };
    }

    const replacingImages = Array.isArray(input.images);
    const newImages = replacingImages
      ? (input.images ?? []).map((img, idx) => ({
          ...img,
          isPrimary: idx === 0,
          order: idx,
        }))
      : [];

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id: input.id }, data });

        if (replacingImages) {
          await tx.productImage.deleteMany({ where: { productId: input.id } });
          if (newImages.length) {
            await tx.productImage.createMany({
              data: newImages.map((img) => ({
                productId: input.id,
                url: img.url,
                key: img.key,
                isPrimary: img.isPrimary,
                order: img.order,
              })),
            });
          }
        }

        return tx.product.findUnique({
          where: { id: input.id },
          include: { images: { orderBy: { order: 'asc' } } },
        });
      });

      if (replacingImages) {
        const newKeys = new Set(newImages.map((i) => i.key));
        const orphans = existing.images.filter((i) => !newKeys.has(i.key));
        for (const img of orphans) {
          this.r2.delete(img.key).catch(() =>
            this.logger.warn(`Falha ao remover ${img.key} do R2`),
          );
        }
      }

      return updated as unknown as ProductEntity;
    } catch (err: unknown) {
      const isUniqueViolation =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002';
      if (isUniqueViolation) {
        throw new ConflictException('Já existe um produto com este SKU ou nome.');
      }
      throw err;
    }
  }
}
