import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AiCreditAccountEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => Int) balance!: number; // pool web
  @Field(() => Int) whatsappBalance!: number; // pool bot WhatsApp (separado)
  @Field(() => Int) lowThreshold!: number;
  @Field(() => Int) totalPurchased!: number;
  @Field(() => Int) totalConsumed!: number;
  @Field() isLow!: boolean;
  @Field() isEmpty!: boolean;
}

@ObjectType()
export class AiCreditPackageEntity {
  @Field(() => Int) brl!: number;
  @Field(() => Int) base!: number;
  @Field(() => Int) bonus!: number;
  @Field(() => Int) total!: number;
  @Field(() => String, { nullable: true }) badge?: string | null;
}

@ObjectType()
export class AiCreditPurchaseEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => Int) packageBrl!: number;
  @Field(() => Int) creditsTotal!: number;
  @Field() pixKey!: string;
  @Field() pixCopyPaste!: string;
  @Field() pixTxid!: string;
  @Field() status!: string;
  @Field(() => Date, { nullable: true }) paidAt?: Date | null;
  @Field() createdAt!: Date;
  @Field() expiresAt!: Date;
  @Field(() => String, { nullable: true }) companyName?: string | null;
  @Field(() => String, { nullable: true }) createdByName?: string | null;
}

@ObjectType()
export class AiCreditTransactionEntity {
  @Field(() => ID) id!: string;
  @Field() kind!: string;
  @Field(() => Int) amount!: number;
  @Field(() => Int) balanceAfter!: number;
  @Field() description!: string;
  @Field(() => String, { nullable: true }) refType?: string | null;
  @Field(() => String, { nullable: true }) refId?: string | null;
  @Field() createdAt!: Date;
}
