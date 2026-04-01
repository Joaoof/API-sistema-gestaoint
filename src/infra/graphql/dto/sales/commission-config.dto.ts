/* eslint-disable no-unused-vars */

import { Field, Float, ObjectType, registerEnumType } from '@nestjs/graphql';
import { CommissionRuleType } from '../../../../core/ports/sales/commission-rule.repository';

export enum CommissionRuleTypeGraphQL {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_PER_SALE = 'FIXED_PER_SALE',
}

registerEnumType(CommissionRuleTypeGraphQL, {
  name: 'CommissionRuleType',
});

@ObjectType()
export class CommissionConfigGraphQL {
  @Field(() => CommissionRuleTypeGraphQL)
  commissionType: CommissionRuleType;

  @Field(() => Float)
  commissionValue: number;

  @Field(() => Float)
  pointsPerCurrencyUnit: number;
}
