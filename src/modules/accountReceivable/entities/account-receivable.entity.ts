import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AccountStatus } from '@prisma/client';
import { CustomerEntity } from '../../customer/entities/customer.entity';
import { ProductEntity } from '../../product/entities/product.entity';

registerEnumType(AccountStatus, { name: 'AccountStatus' });

@ObjectType()
export class AccountReceivableEntity {
  @Field(() => ID) id!: string;
  @Field() customerId!: string;
  @Field(() => String, { nullable: true }) productId?: string | null;
  @Field() description!: string;
  @Field(() => Float) amount!: number;
  @Field(() => Float) interestRate!: number;
  @Field() dueDate!: Date;
  @Field(() => Date, { nullable: true }) paidAt?: Date | null;
  @Field(() => AccountStatus) status!: AccountStatus;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;

  @Field(() => Float) finalAmount!: number;
  @Field(() => Float) interestAccrued!: number;
  @Field() daysOverdue!: number;

  @Field(() => CustomerEntity, { nullable: true }) customer?: CustomerEntity | null;
  @Field(() => ProductEntity, { nullable: true }) product?: ProductEntity | null;
}
