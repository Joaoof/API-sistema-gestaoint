/* eslint-disable no-unused-vars */

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CommissionPolicyService } from '../../../core/services/commission/commission-policy.service';
import { CreateSalesProductUseCase } from '../../../core/use-cases/sales/create-sales-product.use-case';
import { CreateSellerUseCase } from '../../../core/use-cases/sales/create-seller.use-case';
import { ListSalesProductsUseCase } from '../../../core/use-cases/sales/list-sales-products.use-case';
import { ListSalesUseCase } from '../../../core/use-cases/sales/list-sales.use-case';
import { ListSellersUseCase } from '../../../core/use-cases/sales/list-sellers.use-case';
import { RegisterSaleUseCase } from '../../../core/use-cases/sales/register-sale.use-case';
import { CommissionConfigGraphQL } from '../dto/sales/commission-config.dto';
import { SaleGraphQL } from '../dto/sales/sale.dto';
import {
  CreateSalesProductInput,
  CreateSellerInput,
  RegisterSaleInput,
  UpdateCommissionConfigInput,
} from '../dto/sales/sales.input';
import { SalesProductGraphQL } from '../dto/sales/sales-product.dto';
import { SellerGraphQL } from '../dto/sales/seller.dto';

@Resolver()
export class SalesResolver {
  constructor(
    private readonly createSellerUseCase: CreateSellerUseCase,
    private readonly createSalesProductUseCase: CreateSalesProductUseCase,
    private readonly registerSaleUseCase: RegisterSaleUseCase,
    private readonly listSellersUseCase: ListSellersUseCase,
    private readonly listSalesProductsUseCase: ListSalesProductsUseCase,
    private readonly listSalesUseCase: ListSalesUseCase,
    private readonly commissionPolicyService: CommissionPolicyService,
  ) {}

  @Mutation(() => SellerGraphQL)
  createSeller(@Args('input') input: CreateSellerInput) {
    return this.createSellerUseCase.execute(input);
  }

  @Mutation(() => SalesProductGraphQL)
  createSalesProduct(@Args('input') input: CreateSalesProductInput) {
    return this.createSalesProductUseCase.execute(input);
  }

  @Mutation(() => SaleGraphQL)
  registerSale(@Args('input') input: RegisterSaleInput) {
    return this.registerSaleUseCase.execute(input);
  }

  @Mutation(() => CommissionConfigGraphQL)
  updateCommissionConfiguration(
    @Args('input') input: UpdateCommissionConfigInput,
  ) {
    return this.commissionPolicyService.updateSettings(input);
  }

  @Query(() => [SellerGraphQL])
  sellers() {
    return this.listSellersUseCase.execute();
  }

  @Query(() => [SalesProductGraphQL])
  salesProducts() {
    return this.listSalesProductsUseCase.execute();
  }

  @Query(() => [SaleGraphQL])
  sales() {
    return this.listSalesUseCase.execute();
  }

  @Query(() => CommissionConfigGraphQL)
  commissionConfiguration() {
    return this.commissionPolicyService.getSettings();
  }
}
