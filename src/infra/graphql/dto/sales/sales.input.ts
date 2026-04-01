/* eslint-disable no-unused-vars */

import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import { CommissionRuleTypeGraphQL } from './commission-config.dto';

@InputType()
export class CreateSellerInput {
  @Field()
  name: string;

  @Field()
  email: string;
}

@InputType()
export class CreateSalesProductInput {
  @Field()
  name: string;

  @Field()
  sku: string;

  @Field(() => Float)
  unitPrice: number;
}

@InputType()
export class RegisterSaleItemInput {
  @Field(() => ID)
  productId: string;

  @Field(() => Int)
  quantity: number;
}

@InputType()
export class RegisterSaleInput {
  @Field(() => ID)
  sellerId: string;

  @Field(() => [RegisterSaleItemInput])
  items: RegisterSaleItemInput[];
}

@InputType()
export class UpdateCommissionConfigInput {
  @Field(() => CommissionRuleTypeGraphQL)
  commissionType: CommissionRuleTypeGraphQL;

  @Field(() => Float)
  commissionValue: number;

  @Field(() => Float)
  pointsPerCurrencyUnit: number;
}
