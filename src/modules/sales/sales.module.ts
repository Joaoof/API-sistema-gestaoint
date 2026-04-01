/* eslint-disable no-unused-vars */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CommissionPolicyService } from '../../core/services/commission/commission-policy.service';
import { PercentageCommissionCalculator } from '../../core/services/commission/percentage-commission.calculator';
import { RevenuePointsCalculator } from '../../core/services/commission/revenue-points.calculator';
import { CreateSalesProductUseCase } from '../../core/use-cases/sales/create-sales-product.use-case';
import { CreateSellerUseCase } from '../../core/use-cases/sales/create-seller.use-case';
import { ListSalesProductsUseCase } from '../../core/use-cases/sales/list-sales-products.use-case';
import { ListSalesUseCase } from '../../core/use-cases/sales/list-sales.use-case';
import { ListSellersUseCase } from '../../core/use-cases/sales/list-sellers.use-case';
import { RegisterSaleUseCase } from '../../core/use-cases/sales/register-sale.use-case';
import { PrismaCommissionRuleRepository } from '../../infra/database/implementations/sales/commission-rule.prisma.repository';
import { PrismaSaleRepository } from '../../infra/database/implementations/sales/sale.prisma.repository';
import { PrismaSalesProductRepository } from '../../infra/database/implementations/sales/sales-product.prisma.repository';
import { PrismaSellerRepository } from '../../infra/database/implementations/sales/seller.prisma.repository';
import { SalesResolver } from '../../infra/graphql/resolvers/sales.resolver';

@Module({
  imports: [PrismaModule],
  providers: [
    SalesResolver,
    CreateSellerUseCase,
    CreateSalesProductUseCase,
    RegisterSaleUseCase,
    ListSellersUseCase,
    ListSalesProductsUseCase,
    ListSalesUseCase,
    CommissionPolicyService,
    PercentageCommissionCalculator,
    RevenuePointsCalculator,
    {
      provide: 'SellerRepository',
      useClass: PrismaSellerRepository,
    },
    {
      provide: 'SalesProductRepository',
      useClass: PrismaSalesProductRepository,
    },
    {
      provide: 'SaleRepository',
      useClass: PrismaSaleRepository,
    },
    {
      provide: 'CommissionRuleRepository',
      useClass: PrismaCommissionRuleRepository,
    },
    {
      provide: 'CommissionCalculator',
      useExisting: PercentageCommissionCalculator,
    },
    {
      provide: 'PointsCalculator',
      useExisting: RevenuePointsCalculator,
    },
  ],
})
export class SalesModule {}
