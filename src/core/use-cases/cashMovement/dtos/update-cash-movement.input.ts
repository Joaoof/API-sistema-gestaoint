import { InputType, Field, Float } from '@nestjs/graphql';
import {
  CashMovementCategory,
  CashMovementCategories,
} from '../../../../infra/graphql/enum/CashMovementCategory.enum';
import {
  CashMovementType,
  CashMovementTypes,
} from '../../../../infra/graphql/enum/CashMovementType.enum';
import {
  MovementTypePayment,
  MovementTypePayments,
} from '../../../../infra/graphql/enum/CashMovementTypePayement.enum';
import {
  CashMovementStatus,
  CashMovementStatuses,
} from '../../../../infra/graphql/enum/CashMovementStatus.enum';

@InputType()
export class UpdateCashMovementInput {
  @Field(() => CashMovementTypes, { nullable: true })
  type?: CashMovementType;

  @Field(() => CashMovementCategories, { nullable: true })
  category?: CashMovementCategory;

  @Field(() => MovementTypePayments, { nullable: true })
  typePayment?: MovementTypePayment | null;

  @Field(() => CashMovementStatuses, { nullable: true })
  status?: CashMovementStatus;

  @Field(() => Float, { nullable: true })
  value?: number;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Date, { nullable: true })
  date?: Date;

  @Field(() => Date, { nullable: true })
  dueDate?: Date | null;

  @Field(() => Date, { nullable: true })
  paidAt?: Date | null;

  @Field(() => String, { nullable: true })
  referenceCode?: string | null;

  @Field(() => String, { nullable: true })
  counterpartyName?: string | null;

  @Field(() => String, { nullable: true })
  counterpartyDocument?: string | null;

  @Field(() => String, { nullable: true })
  notes?: string | null;

  @Field(() => String, { nullable: true })
  attachmentUrl?: string | null;

  @Field(() => String, { nullable: true })
  bankId?: string | null;
}
