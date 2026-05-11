import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { WarehouseService } from './warehouse.service';

interface ActorContext {
  userId: string;
  companyId: string;
}

interface AdjustArgs {
  productId: string;
  warehouseId?: string;
  quantity: number;
  unitCost?: number;
  reason?: string;
  reference?: string;
}

// Cliente Prisma dentro de uma transação interativa.
export type Tx = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * InventoryService — fonte única de verdade para alterações de estoque.
 *
 * - `entry`/`exit`/`transfer`: abrem sua própria transação.
 * - `entryInTx`/`exitInTx`: aceitam transação aberta — use quando outro
 *   use-case (ex: Order.create) precisa fazer movimentação dentro da sua
 *   própria transação para garantir atomicidade.
 */
@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly warehouses: WarehouseService,
  ) {}

  async getProductBalance(companyId: string, productId: string) {
    const rows = await this.prisma.inventory.findMany({
      where: { companyId, productId },
      include: {
        warehouse: { select: { id: true, name: true, isMain: true } },
      },
      orderBy: [{ warehouse: { isMain: 'desc' } }],
    });
    return rows.map((i) => ({
      warehouseId: i.warehouseId,
      warehouseName: i.warehouse.name,
      isMain: i.warehouse.isMain,
      quantity: i.quantity,
      minStock: i.minStock,
    }));
  }

  async entry(actor: ActorContext, args: AdjustArgs) {
    if (args.quantity <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero.');
    }
    return this.prisma.$transaction((tx) => this.entryInTx(tx, actor, args));
  }

  async exit(actor: ActorContext, args: AdjustArgs) {
    if (args.quantity <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero.');
    }
    return this.prisma.$transaction((tx) => this.exitInTx(tx, actor, args));
  }

  async entryInTx(tx: Tx, actor: ActorContext, args: AdjustArgs) {
    const product = await tx.product.findFirst({
      where: { id: args.productId, companyId: actor.companyId },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    const warehouseId = await this.resolveWarehouseId(actor.companyId, args.warehouseId);

    const inv = await tx.inventory.upsert({
      where: {
        productId_warehouseId: { productId: args.productId, warehouseId },
      },
      create: {
        companyId: actor.companyId,
        productId: args.productId,
        warehouseId,
        quantity: args.quantity,
        minStock: product.minStock,
      },
      update: { quantity: { increment: args.quantity } },
    });

    const totalQtyBefore = product.quantity;
    const newTotalQty = totalQtyBefore + args.quantity;
    let newAvg = Number(product.averageCost);
    if (args.unitCost && args.unitCost > 0) {
      newAvg =
        totalQtyBefore > 0
          ? (totalQtyBefore * Number(product.averageCost) + args.quantity * args.unitCost) /
            newTotalQty
          : args.unitCost;
    }

    await tx.product.update({
      where: { id: product.id },
      data: { quantity: newTotalQty, averageCost: newAvg },
    });

    await tx.inventoryMovement.create({
      data: {
        companyId: actor.companyId,
        productId: product.id,
        warehouseId,
        type: 'ENTRY',
        quantity: args.quantity,
        unitCost: args.unitCost ?? null,
        reason: args.reason ?? null,
        reference: args.reference ?? null,
        userId: actor.userId,
      },
    });

    return { inventory: inv, productQuantity: newTotalQty, averageCost: newAvg };
  }

  async exitInTx(tx: Tx, actor: ActorContext, args: AdjustArgs) {
    const product = await tx.product.findFirst({
      where: { id: args.productId, companyId: actor.companyId },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    const warehouseId = await this.resolveWarehouseId(actor.companyId, args.warehouseId);

    const inv = await tx.inventory.findUnique({
      where: { productId_warehouseId: { productId: args.productId, warehouseId } },
    });
    const currentQty = inv?.quantity ?? 0;
    if (currentQty < args.quantity) {
      throw new BadRequestException(
        `Estoque insuficiente para "${product.nameProduct}" no depósito (${currentQty} disponível, ${args.quantity} solicitado).`,
      );
    }

    const updatedInv = await tx.inventory.update({
      where: { productId_warehouseId: { productId: args.productId, warehouseId } },
      data: { quantity: { decrement: args.quantity } },
    });

    const newTotalQty = product.quantity - args.quantity;
    await tx.product.update({
      where: { id: product.id },
      data: { quantity: newTotalQty },
    });

    await tx.inventoryMovement.create({
      data: {
        companyId: actor.companyId,
        productId: product.id,
        warehouseId,
        type: 'EXIT',
        quantity: args.quantity,
        reason: args.reason ?? null,
        reference: args.reference ?? null,
        userId: actor.userId,
      },
    });

    return { inventory: updatedInv, productQuantity: newTotalQty };
  }

  async transfer(
    actor: ActorContext,
    args: {
      productId: string;
      fromWarehouseId: string;
      toWarehouseId: string;
      quantity: number;
      reason?: string;
    },
  ) {
    if (args.fromWarehouseId === args.toWarehouseId) {
      throw new BadRequestException('Origem e destino devem ser diferentes.');
    }
    if (args.quantity <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero.');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: args.productId, companyId: actor.companyId },
      select: { id: true, minStock: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    const [from, to] = await Promise.all([
      this.prisma.warehouse.findFirst({
        where: { id: args.fromWarehouseId, companyId: actor.companyId },
      }),
      this.prisma.warehouse.findFirst({
        where: { id: args.toWarehouseId, companyId: actor.companyId },
      }),
    ]);
    if (!from) throw new NotFoundException('Depósito de origem não encontrado.');
    if (!to) throw new NotFoundException('Depósito de destino não encontrado.');

    const transferId = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const fromInv = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: args.productId,
            warehouseId: args.fromWarehouseId,
          },
        },
      });
      if (!fromInv || fromInv.quantity < args.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente em ${from.name} (${fromInv?.quantity ?? 0} disponível).`,
        );
      }

      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: args.productId,
            warehouseId: args.fromWarehouseId,
          },
        },
        data: { quantity: { decrement: args.quantity } },
      });

      await tx.inventory.upsert({
        where: {
          productId_warehouseId: {
            productId: args.productId,
            warehouseId: args.toWarehouseId,
          },
        },
        create: {
          companyId: actor.companyId,
          productId: args.productId,
          warehouseId: args.toWarehouseId,
          quantity: args.quantity,
          minStock: product.minStock,
        },
        update: { quantity: { increment: args.quantity } },
      });

      await tx.inventoryMovement.createMany({
        data: [
          {
            companyId: actor.companyId,
            productId: args.productId,
            warehouseId: args.fromWarehouseId,
            type: 'TRANSFER_OUT',
            quantity: args.quantity,
            reason: args.reason ?? `Transferência → ${to.name}`,
            transferId,
            userId: actor.userId,
          },
          {
            companyId: actor.companyId,
            productId: args.productId,
            warehouseId: args.toWarehouseId,
            type: 'TRANSFER_IN',
            quantity: args.quantity,
            reason: args.reason ?? `Transferência ← ${from.name}`,
            transferId,
            userId: actor.userId,
          },
        ],
      });

      return { transferId, from: from.name, to: to.name, quantity: args.quantity };
    });
  }

  private async resolveWarehouseId(
    companyId: string,
    warehouseId?: string,
  ): Promise<string> {
    if (warehouseId) {
      const wh = await this.prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId, active: true },
      });
      if (!wh) throw new NotFoundException('Depósito não encontrado ou inativo.');
      return wh.id;
    }
    const main = await this.warehouses.findMain(companyId);
    return main.id;
  }
}
