import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { BankAccountType } from '@prisma/client';

registerEnumType(BankAccountType, { name: 'BankAccountType' });

@ObjectType()
export class BankEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => BankAccountType) tipo!: BankAccountType;
  @Field(() => String, { nullable: true }) agencia?: string | null;
  @Field(() => String, { nullable: true }) conta?: string | null;
  @Field(() => String, { nullable: true }) digito?: string | null;
  @Field(() => String, { nullable: true }) titular?: string | null;
  @Field(() => String, { nullable: true }) documento?: string | null;
  @Field(() => String, { nullable: true }) pixKey?: string | null;
  @Field(() => Float) saldoInicial!: number;
  @Field() corHex!: string;
  @Field() ativo!: boolean;
  @Field(() => String, { nullable: true }) observacoes?: string | null;
  @Field() user_id!: string;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
