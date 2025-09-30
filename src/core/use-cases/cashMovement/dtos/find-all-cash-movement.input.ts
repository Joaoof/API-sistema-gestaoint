// dto/find-all-cash-movement.input.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class FindAllCashMovementInput {
  @Field({ nullable: true })
  date?: Date;

  @Field()
  description: string;

  @Field({ nullable: true })
  type?: 'SALE' | 'CHANGE' | 'OTHER_IN' | 'EXPENSE' | 'WITHDRAWAL' | 'PAYMENT';

  @Field()
  value: number;
}
