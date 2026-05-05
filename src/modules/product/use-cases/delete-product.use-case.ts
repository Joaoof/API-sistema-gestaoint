import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { R2Service } from '../../../infra/services/r2/r2.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';

@Injectable()
export class DeleteProductUseCase {
  private readonly logger = new Logger(DeleteProductUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly audit: AuditLogService,
  ) {}

  async execute(actor: AuditActor, productId: string): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    // Soft delete + remove imagens do R2 em best-effort
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
      include: { images: true },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Product',
      entityId: productId,
      action: AuditAction.SOFT_DELETE,
      before: {
        ...product,
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
        weight: product.weight ? Number(product.weight) : null,
      },
      after: {
        ...updated,
        costPrice: Number(updated.costPrice),
        salePrice: Number(updated.salePrice),
        weight: updated.weight ? Number(updated.weight) : null,
      },
      reason: 'Produto removido (soft delete).',
    });

    for (const img of product.images) {
      this.r2.delete(img.key).catch((err: unknown) =>
        this.logger.warn(
          `Falha ao remover ${img.key}: ${err instanceof Error ? err.message : err}`,
        ),
      );
    }

    return true;
  }
}
