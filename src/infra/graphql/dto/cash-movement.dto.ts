import { ObjectType, Field, Float } from '@nestjs/graphql';
import {
  CashMovementType,
  CashMovementTypes,
} from '../enum/CashMovementType.enum';
import { CashMovementCategories, CashMovementCategory } from '../enum/CashMovementCategory.enum';
import {
  MovementTypePayments,
  MovementTypePayment,
} from '../enum/CashMovementTypePayement.enum';

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
