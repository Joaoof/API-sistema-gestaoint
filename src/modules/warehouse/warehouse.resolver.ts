import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import {
  CreateWarehouseInput,
  InventoryAdjustInput,
  InventoryTransferInput,
  UpdateWarehouseInput,
} from './dto/warehouse.input';
import {
  InventoryAdjustmentResult,
  InventoryTransferResult,
  ProductInventoryBalance,
  WarehouseEntity,
} from './entities/warehouse.entities';
import { InventoryService } from './use-cases/inventory.service';
import { WarehouseService } from './use-cases/warehouse.service';

@Resolver()
@UseGuards(GqlAuthGuard)
export class WarehouseResolver {
  constructor(
    private readonly warehouseService: WarehouseService,
    private readonly inventory: InventoryService,
    private readonly tenancy: TenancyService,
  ) {}

  // ============ Warehouses ============

  @Query(() => [WarehouseEntity])
  async warehouses(
    @CurrentUser() user: User,
    @Args('activeOnly', { nullable: true }) activeOnly?: boolean,
  ): Promise<WarehouseEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.warehouseService.list(companyId, activeOnly === true);
    return rows.map((r) => ({ ...r }));
  }

  @Mutation(() => WarehouseEntity)
  async createWarehouse(
    @CurrentUser() user: User,
    @Args('input') input: CreateWarehouseInput,
  ): Promise<WarehouseEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.warehouseService.create(
      { userId: user.id, companyId },
      input,
    ) as any;
  }

  @Mutation(() => WarehouseEntity)
  async updateWarehouse(
    @CurrentUser() user: User,
    @Args('input') input: UpdateWarehouseInput,
  ): Promise<WarehouseEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.warehouseService.update(
      { userId: user.id, companyId },
      input.id,
      input,
    ) as any;
  }

  @Mutation(() => Boolean)
  async deactivateWarehouse(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    await this.warehouseService.deactivate({ userId: user.id, companyId }, id);
    return true;
  }

  // ============ Inventory (por depósito) ============

  @Query(() => [ProductInventoryBalance])
  async productInventory(
    @CurrentUser() user: User,
    @Args('productId') productId: string,
  ): Promise<ProductInventoryBalance[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.inventory.getProductBalance(companyId, productId);
  }

  @Mutation(() => InventoryAdjustmentResult)
  async inventoryEntry(
    @CurrentUser() user: User,
    @Args('input') input: InventoryAdjustInput,
  ): Promise<InventoryAdjustmentResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const out = await this.inventory.entry(
      { userId: user.id, companyId },
      input,
    );
    return {
      productId: input.productId,
      warehouseId: out.inventory.warehouseId,
      productQuantity: out.productQuantity,
      averageCost: out.averageCost,
    };
  }

  @Mutation(() => InventoryAdjustmentResult)
  async inventoryExit(
    @CurrentUser() user: User,
    @Args('input') input: InventoryAdjustInput,
  ): Promise<InventoryAdjustmentResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const out = await this.inventory.exit(
      { userId: user.id, companyId },
      input,
    );
    return {
      productId: input.productId,
      warehouseId: out.inventory.warehouseId,
      productQuantity: out.productQuantity,
      averageCost: null,
    };
  }

  @Mutation(() => InventoryTransferResult)
  async inventoryTransfer(
    @CurrentUser() user: User,
    @Args('input') input: InventoryTransferInput,
  ): Promise<InventoryTransferResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.inventory.transfer({ userId: user.id, companyId }, input);
  }
}
