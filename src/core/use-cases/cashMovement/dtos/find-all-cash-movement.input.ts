import {
  InputType,
  Field,
  Float,
  Int,
  registerEnumType,
} from '@nestjs/graphql';
import {
  CashMovementType,
  CashMovementTypes,
} from '../../../../infra/graphql/enum/CashMovementType.enum';
import {
  CashMovementCategory,
  CashMovementCategories,
} from '../../../../infra/graphql/enum/CashMovementCategory.enum';
import {
  MovementTypePayment,
  MovementTypePayments,
} from '../../../../infra/graphql/enum/CashMovementTypePayement.enum';
import {
  CashMovementStatus,
  CashMovementStatuses,
} from '../../../../infra/graphql/enum/CashMovementStatus.enum';

export const CashMovementSortFields = {
  DATE: 'DATE',
  VALUE: 'VALUE',
  CREATED_AT: 'CREATED_AT',
  DUE_DATE: 'DUE_DATE',
} as const;
export type CashMovementSortField =
  (typeof CashMovementSortFields)[keyof typeof CashMovementSortFields];

export const SortDirections = { ASC: 'ASC', DESC: 'DESC' } as const;
export type SortDirection =
  (typeof SortDirections)[keyof typeof SortDirections];

registerEnumType(CashMovementSortFields, { name: 'CashMovementSortField' });
registerEnumType(SortDirections, { name: 'SortDirection' });

@InputType()
export class FindAllCashMovementInput {
  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => CashMovementTypes, { nullable: true })
  type?: CashMovementType;

  @Field(() => [CashMovementCategories], { nullable: true })
  categories?: CashMovementCategory[];

  @Field(() => [MovementTypePayments], { nullable: true })
  paymentMethods?: MovementTypePayment[];

  @Field(() => [CashMovementStatuses], { nullable: true })
  statuses?: CashMovementStatus[];

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => Float, { nullable: true })
  minValue?: number;

  @Field(() => Float, { nullable: true })
  maxValue?: number;

  @Field(() => String, { nullable: true })
  referenceCode?: string;

  @Field(() => String, { nullable: true })
  counterparty?: string;

  @Field(() => CashMovementSortFields, { nullable: true })
  sortBy?: CashMovementSortField;

  @Field(() => SortDirections, { nullable: true })
  sortDirection?: SortDirection;

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => Int, { nullable: true })
  pageSize?: number;
}
