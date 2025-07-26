// src/modules/supplier/supplier.module.ts

import { Module } from '@nestjs/common';
import { SupplierController } from './controller/supplier.controller';
import { CreateSupplierUseCase } from 'src/core/use-cases/supplier/create-supplier.use-case';
import { PrismaSupplierRepository } from 'src/infra/database/implementations/supplier/supplier.prisma.repository';
import { SuppliersRepository } from 'src/core/ports/supplier.repository';
import { LoggerService } from 'src/core/ports/logger.service';
import { ConsoleLogger } from 'src/infra/logging/console.logger';
import { PrismaService } from 'prisma/prisma.service';
import { CoreModule } from 'src/core/core.module';

@Module({
    imports: [
        CoreModule
    ],
    controllers: [SupplierController],
    providers: [
        CreateSupplierUseCase,
        {
            provide: 'SuppliersRepository',
            useClass: PrismaSupplierRepository,
        },
        PrismaService,
    ],
})
export class SupplierModule {}