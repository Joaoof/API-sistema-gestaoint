import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PaymentReceiptEntity {
  @Field(() => ID) id!: string;
  @Field(() => String, { nullable: true }) accountReceivableId?: string | null;
  @Field(() => String, { nullable: true }) accountPayableId?: string | null;
  @Field(() => Float) amount!: number;
  @Field() paymentMethod!: string;
  @Field(() => String, { nullable: true }) bankId?: string | null;
  @Field() paidAt!: Date;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field(() => String, { nullable: true }) cashMovementId?: string | null;
  @Field() createdByUserId!: string;
  @Field() createdAt!: Date;
}

@ObjectType()
export class RecordPaymentResult {
  @Field(() => PaymentReceiptEntity) receipt!: PaymentReceiptEntity;
  @Field() accountId!: string;
  @Field(() => Float) newPaidAmount!: number;
  @Field() status!: string;
  @Field() fullyPaid!: boolean;
}
