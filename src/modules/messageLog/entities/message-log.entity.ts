import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  MessageDirection,
  MessageStatus,
  NotificationChannel,
} from '@prisma/client';

registerEnumType(MessageDirection, { name: 'MessageDirection' });
registerEnumType(MessageStatus, { name: 'MessageStatus' });

@ObjectType()
export class MessageLogEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => NotificationChannel) channel!: NotificationChannel;
  @Field(() => MessageDirection) direction!: MessageDirection;
  @Field() toAddress!: string;
  @Field(() => String, { nullable: true }) fromAddress?: string | null;
  @Field(() => String, { nullable: true }) subject?: string | null;
  @Field() body!: string;
  @Field(() => MessageStatus) status!: MessageStatus;
  @Field(() => String, { nullable: true }) externalId?: string | null;
  @Field(() => String, { nullable: true }) errorMessage?: string | null;
  @Field(() => String, { nullable: true }) customerId?: string | null;
  @Field(() => String, { nullable: true }) customerName?: string | null;
  @Field(() => String, { nullable: true }) templateKey?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) sentAt?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) deliveredAt?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) readAt?: Date | null;
}

@ObjectType()
export class MessageLogPageEntity {
  @Field(() => [MessageLogEntity]) items!: MessageLogEntity[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
}
