import { InputType, Field, Float } from '@nestjs/graphql';
import { CashMovementType, CashMovementTypes } from '../enum/CashMovementType.enum';
import { CashMovementCategory, CashMovementCategories } from '../enum/CashMovementCategory.enum';
import { MovementTypePayment, MovementTypePayments } from '../enum/CashMovementTypePayement.enum';

@InputType()
export class CreateCashMovementInput {
  @Field(() => String)
  type: CashMovementType; // ENTRY | EXIT

  @Field(() => Float)
  value: number;

  @Field(() => String)
  category: CashMovementCategory; // SALE | EXPENSE | etc.

  @Field(() => String)
  typePayment: MovementTypePayment

  @Field(() => String)
  description: string;

  @Field({ nullable: true })
  date: Date;
}
