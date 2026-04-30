import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CustomerEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) document?: string | null;
  @Field(() => String, { nullable: true }) email?: string | null;
  @Field(() => String, { nullable: true }) phone?: string | null;
  @Field(() => String, { nullable: true }) address?: string | null;
  @Field(() => String, { nullable: true }) bairro?: string | null;
  @Field(() => String, { nullable: true }) cep?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
