import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, ProductKind, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { R2Service } from '../../../infra/services/r2/r2.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { UpdateProductInput } from '../dto/update-product.input';
import { ProductEntity } from '../entities/product.entity';

function snapshot(
  raw: Prisma.ProductGetPayload<{ include: { images: true } }>,
): Record<string, unknown> {
  return {
    ...raw,
    costPrice: Number(raw.costPrice),
    salePrice: Number(raw.salePrice),
    weight: raw.weight ? Number(raw.weight) : null,
  };
}

@Injectable()
export class UpdateProductUseCase {
  private readonly logger = new Logger(UpdateProductUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly audit: AuditLogService,
  ) {}

  async execute(
    actor: AuditActor,
    input: UpdateProductInput,
  ): Promise<ProductEntity> {
    const existing = await this.prisma.product.findFirst({
      where: { id: input.id, companyId: actor.companyId, deletedAt: null },
      include: { images: true },
    });
    if (!existing) {
      throw new NotFoundException('Produto não encontrado.');
    }

    // Determina natureza efetiva (após o update) para zerar estoque de SERVICE/LABOR.
    const effectiveKind = input.kind ?? existing.kind;
    const isStockless = effectiveKind !== ProductKind.PRODUCT;

    const data: Prisma.ProductUpdateInput = {};
    if (input.kind !== undefined) data.kind = input.kind;
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.nameProduct !== undefined) data.nameProduct = input.nameProduct;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.costPrice !== undefined) data.costPrice = input.costPrice;
    if (input.salePrice !== undefined) data.salePrice = input.salePrice;
    if (input.quantity !== undefined) {
      data.quantity = isStockless ? 0 : input.quantity;
    } else if (input.kind && isStockless) {
      // Mudou para SERVICE/LABOR sem mexer em quantity → zera estoque.
      data.quantity = 0;
    }
    if (input.minStock !== undefined) {
      data.minStock = isStockless ? 0 : input.minStock;
    } else if (input.kind && isStockless) {
      data.minStock = 0;
    }
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

        const final = await tx.product.findUnique({
          where: { id: input.id },
          include: { images: { orderBy: { order: 'asc' } } },
        });

        if (final) {
          await this.audit.log(
            {
              companyId: actor.companyId,
              userId: actor.userId,
              entity: 'Product',
              entityId: final.id,
              action: AuditAction.UPDATE,
              before: snapshot(existing),
              after: snapshot(final),
            },
            tx,
          );
        }

        return final;
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
