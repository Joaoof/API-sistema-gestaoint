import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { ProductEntity } from '../entities/product.entity';

interface AdjustArgs {
  productId: string;
  quantity: number; // sempre positivo
  notes?: string | null;
}

@Injectable()
export class AdjustInventoryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async productionEntry(
    actor: AuditActor,
    args: AdjustArgs,
  ): Promise<ProductEntity> {
    if (args.quantity <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero.');
    }
    return this.applyDelta(actor, args.productId, args.quantity, args.notes ?? null, 'PRODUCTION');
  }

  async quickExit(
    actor: AuditActor,
    args: AdjustArgs & { reason: string },
  ): Promise<ProductEntity> {
    if (args.quantity <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero.');
    }
    return this.applyDelta(
      actor,
      args.productId,
      -args.quantity,
      [args.reason, args.notes].filter(Boolean).join(' — ') || null,
      'EXIT',
    );
  }

  private async applyDelta(
    actor: AuditActor,
    productId: string,
    delta: number,
    note: string | null,
    kind: 'PRODUCTION' | 'EXIT',
  ): Promise<ProductEntity> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true, images: true, category: true, supplier: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    const newQuantity = product.quantity + delta;
    if (newQuantity < 0) {
      throw new BadRequestException(
        `Estoque insuficiente. Atual: ${product.quantity}, retirando ${Math.abs(delta)}.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: productId },
        data: { quantity: newQuantity },
        include: { inventory: true, images: true, category: true, supplier: true },
      });
      if (p.inventory) {
        await tx.inventory.update({
          where: { productId },
          data: { quantity: newQuantity },
        });
      }
      return p;
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Product',
      entityId: productId,
      action: AuditAction.UPDATE,
      before: { quantity: product.quantity },
      after: { quantity: newQuantity },
      reason: `${kind === 'PRODUCTION' ? 'Entrada de produção' : 'Saída rápida'}: ${delta > 0 ? '+' : ''}${delta}${note ? ` — ${note}` : ''}`,
    });

    return updated as unknown as ProductEntity;
  }
}
