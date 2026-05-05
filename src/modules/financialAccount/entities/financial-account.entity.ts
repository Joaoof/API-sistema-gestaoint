import {
  Field,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { FinancialAccountType } from '@prisma/client';

registerEnumType(FinancialAccountType, { name: 'FinancialAccountType' });

@ObjectType()
export class FinancialAccountEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field() code!: string;
  @Field() name!: string;
  @Field(() => FinancialAccountType) type!: FinancialAccountType;
  @Field(() => String, { nullable: true }) parentId?: string | null;
  @Field() active!: boolean;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}

@ObjectType()
export class FinancialAccountTreeNode {
  @Field(() => FinancialAccountEntity) account!: FinancialAccountEntity;
  @Field(() => [FinancialAccountTreeNode]) children!: FinancialAccountTreeNode[];
}
