import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CustomerEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) nomeFantasia?: string | null;
  @Field(() => String, { nullable: true }) razaoSocial?: string | null;
  @Field(() => String, { nullable: true }) document?: string | null;
  @Field(() => String, { nullable: true }) email?: string | null;
  @Field(() => String, { nullable: true }) phone?: string | null;
  @Field(() => String, { nullable: true }) address?: string | null;
  @Field(() => String, { nullable: true }) bairro?: string | null;
  @Field(() => String, { nullable: true }) cidade?: string | null;
  @Field(() => String, { nullable: true }) estado?: string | null;
  @Field(() => String, { nullable: true }) cep?: string | null;
  @Field(() => Float, { nullable: true }) latitude?: number | null;
  @Field(() => Float, { nullable: true }) longitude?: number | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
