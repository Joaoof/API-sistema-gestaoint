import { InputType, Field, Float } from '@nestjs/graphql';
import {
  CashMovementType,
  CashMovementTypes,
} from '../enum/CashMovementType.enum';
import {
  CashMovementCategory,
  CashMovementCategories,
} from '../enum/CashMovementCategory.enum';
import {
  MovementTypePayment,
  MovementTypePayments,
} from '../enum/CashMovementTypePayement.enum';
import {
  CashMovementStatus,
  CashMovementStatuses,
} from '../enum/CashMovementStatus.enum';

@InputType()
export class CreateCashMovementInput {
  @Field(() => CashMovementTypes)
  type: CashMovementType;

  @Field(() => CashMovementCategories)
  category: CashMovementCategory;

  @Field(() => MovementTypePayments, { nullable: true })
  typePayment?: MovementTypePayment | null;

  @Field(() => CashMovementStatuses, { nullable: true })
  status?: CashMovementStatus;

  @Field(() => Float)
  value: number;

  @Field(() => String)
  description: string;

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
