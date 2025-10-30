import { ObjectType, Field, Float } from '@nestjs/graphql';
import {
  CashMovementType,
  CashMovementTypes,
} from '../enum/cash-movement-type.enum';
import {
  CashMovementCategories,
  CashMovementCategory,
} from '../enum/cash-movement-category.enum';
import { MovementTypePayment, MovementTypePayments } from '../enum/cash-movement-type-payment.enum';

@ObjectType()
export class CashMovementGraphQL {
  @Field(() => String)
  id: string;

  @Field(() => CashMovementTypes)
  type: CashMovementType;

  @Field(() => CashMovementCategories)
  category: CashMovementCategory;

  @Field(() => MovementTypePayments)
  typePayment: MovementTypePayment;

  @Field(() => Float)
  value: number;

  @Field(() => String)
  description: string;

  @Field(() => Date, { nullable: true })
  date: Date;

  @Field(() => String)
  user_id: string;

  // 👇 Nova mensagem (opcional)
  @Field({ nullable: true })
  message?: string;
}
