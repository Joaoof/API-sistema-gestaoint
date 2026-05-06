import { Field, Float, GraphQLISODateTime, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum TimelineEventType {
  // Financeiro
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_CANCELED = 'ORDER_CANCELED',
  RECEIVABLE_CREATED = 'RECEIVABLE_CREATED',
  RECEIVABLE_PAID = 'RECEIVABLE_PAID',
  RECEIVABLE_OVERDUE = 'RECEIVABLE_OVERDUE',
  PAYABLE_CREATED = 'PAYABLE_CREATED',
  PAYABLE_PAID = 'PAYABLE_PAID',
  CASH_ENTRY = 'CASH_ENTRY',
  CASH_EXIT = 'CASH_EXIT',

  // Comercial
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',

  // Operacional
  DELIVERY_CREATED = 'DELIVERY_CREATED',
  DELIVERY_DELIVERED = 'DELIVERY_DELIVERED',
  STOCK_LOW = 'STOCK_LOW',

  // Comunicações
  WHATSAPP_MESSAGE_IN = 'WHATSAPP_MESSAGE_IN',
  WHATSAPP_CALL = 'WHATSAPP_CALL',
  WHATSAPP_REMINDER_DUE = 'WHATSAPP_REMINDER_DUE',
  WHATSAPP_CHATBOT_FIRED = 'WHATSAPP_CHATBOT_FIRED',
}
registerEnumType(TimelineEventType, { name: 'TimelineEventType' });

export enum TimelineCategory {
  FINANCIAL = 'FINANCIAL',
  COMMERCIAL = 'COMMERCIAL',
  OPERATIONAL = 'OPERATIONAL',
  COMMUNICATIONS = 'COMMUNICATIONS',
  ALERTS = 'ALERTS',
  ACTIVITY = 'ACTIVITY',
}
registerEnumType(TimelineCategory, { name: 'TimelineCategory' });

@ObjectType()
export class TimelineEvent {
  @Field(() => ID) id!: string;
  @Field(() => TimelineEventType) type!: TimelineEventType;
  @Field(() => [TimelineCategory]) categories!: TimelineCategory[];
  @Field(() => GraphQLISODateTime) at!: Date;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => String, { nullable: true }) actor?: string | null;
  @Field(() => Float, { nullable: true }) amount?: number | null;
  @Field(() => String, { nullable: true }) peerNumber?: string | null;
  @Field(() => String, { nullable: true }) entityId?: string | null;
  @Field(() => String, { nullable: true }) entityType?: string | null;
  @Field({ description: 'sale | receivable | payable | cash | customer | delivery | stock | message | reminder | call | chatbot' })
  iconKey!: string;
  /** Cor sugerida pra UI: emerald/amber/rose/blue/violet/slate */
  @Field() colorKey!: string;
}
