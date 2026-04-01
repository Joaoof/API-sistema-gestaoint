/* eslint-disable no-unused-vars */

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Sale } from '../../entities/sales/sale.entity';
import { SaleRepository } from '../../ports/sales/sale.repository';
import { SalesProductRepository } from '../../ports/sales/sales-product.repository';
import { SellerRepository } from '../../ports/sales/seller.repository';
import { CommissionPolicyService } from '../../services/commission/commission-policy.service';

@Injectable()
export class RegisterSaleUseCase {
  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: SaleRepository,
    @Inject('SellerRepository')
    private readonly sellerRepository: SellerRepository,
    @Inject('SalesProductRepository')
    private readonly salesProductRepository: SalesProductRepository,
    private readonly commissionPolicyService: CommissionPolicyService,
  ) {}

  async execute(input: {
    sellerId: string;
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<Sale> {
    if (input.items.length === 0) {
      throw new BadRequestException('A venda precisa ter ao menos um item.');
    }

    const seller = await this.sellerRepository.findById(input.sellerId);
    if (!seller) {
      throw new BadRequestException('Vendedor não encontrado.');
    }

    const productIds = input.items.map((item) => item.productId);
    const products =
      await this.salesProductRepository.findManyByIds(productIds);

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'Um ou mais produtos não foram encontrados.',
      );
    }

    const detailedItems = input.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException('Produto inválido para a venda.');
      }

      const totalPrice = product.unitPrice * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.unitPrice,
        totalPrice,
      };
    });

    const totalAmount = detailedItems.reduce(
      (acc, item) => acc + item.totalPrice,
      0,
    );
    const { commissionAmount, pointsEarned } =
      await this.commissionPolicyService.evaluateSale(totalAmount);

    const sale = await this.saleRepository.create({
      sellerId: input.sellerId,
      totalAmount,
      commissionAmount,
      pointsEarned,
      items: detailedItems,
    });

    await this.sellerRepository.addPerformance({
      sellerId: input.sellerId,
      commissionToAdd: commissionAmount,
      pointsToAdd: pointsEarned,
    });

    return sale;
  }
}
