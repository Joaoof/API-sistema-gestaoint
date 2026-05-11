import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { InventoryService } from './use-cases/inventory.service';
import { WarehouseService } from './use-cases/warehouse.service';
import { WarehouseResolver } from './warehouse.resolver';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [WarehouseService, InventoryService, WarehouseResolver],
  exports: [WarehouseService, InventoryService],
})
export class WarehouseModule {}
