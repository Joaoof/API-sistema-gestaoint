import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { InventoryService } from '../../warehouse/use-cases/inventory.service';
import { ProductEntity } from '../entities/product.entity';

interface AdjustArgs {
  productId: string;
  quantity: number; // sempre positivo
  warehouseId?: string; // se omitido, usa o depósito principal
  unitCost?: number; // só para entrada
  notes?: string | null;
}

@Injectable()
export class AdjustInventoryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly inventory: InventoryService,
  ) {}

  async productionEntry(
    actor: AuditActor,
    args: AdjustArgs,
  ): Promise<ProductEntity> {
    if (args.quantity <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero.');
    }

    const result = await this.inventory.entry(
      { userId: actor.userId!, companyId: actor.companyId },
      {
        productId: args.productId,
        warehouseId: args.warehouseId,
        quantity: args.quantity,
        unitCost: args.unitCost,
        reason: args.notes ?? 'Entrada de produção',
      },
    );

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Product',
      entityId: args.productId,
      action: AuditAction.UPDATE,
      after: { quantity: result.productQuantity, averageCost: result.averageCost },
      reason: `Entrada de produção: +${args.quantity}${args.notes ? ` — ${args.notes}` : ''}`,
    });

    return this.loadProduct(actor.companyId, args.productId);
  }

  async quickExit(
    actor: AuditActor,
    args: AdjustArgs & { reason: string },
  ): Promise<ProductEntity> {
    if (args.quantity <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero.');
    }

    const result = await this.inventory.exit(
      { userId: actor.userId!, companyId: actor.companyId },
      {
        productId: args.productId,
        warehouseId: args.warehouseId,
        quantity: args.quantity,
        reason: [args.reason, args.notes].filter(Boolean).join(' — '),
      },
    );

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Product',
      entityId: args.productId,
      action: AuditAction.UPDATE,
      after: { quantity: result.productQuantity },
      reason: `Saída rápida: -${args.quantity} — ${args.reason}${args.notes ? ` (${args.notes})` : ''}`,
    });

    return this.loadProduct(actor.companyId, args.productId);
  }

  private async loadProduct(companyId: string, productId: string): Promise<ProductEntity> {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
      include: { inventory: true, images: true, category: true, supplier: true },
    });
    if (!p) throw new NotFoundException('Produto não encontrado.');
    return p as unknown as ProductEntity;
  }
}
