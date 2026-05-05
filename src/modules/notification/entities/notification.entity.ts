import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  NotificationChannel,
  NotificationSeverity,
  NotificationType,
} from '@prisma/client';

registerEnumType(NotificationType, { name: 'NotificationType' });
registerEnumType(NotificationSeverity, { name: 'NotificationSeverity' });
registerEnumType(NotificationChannel, { name: 'NotificationChannel' });

@ObjectType()
export class NotificationEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => String, { nullable: true }) userId?: string | null;
  @Field(() => NotificationType) type!: NotificationType;
  @Field(() => NotificationSeverity) severity!: NotificationSeverity;
  @Field() title!: string;
  @Field() message!: string;
  @Field(() => String, { nullable: true }) href?: string | null;
  @Field(() => String, { nullable: true }) entity?: string | null;
  @Field(() => String, { nullable: true }) entityId?: string | null;
  @Field(() => String, { nullable: true, description: 'JSON serializado' })
  metadataJson?: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) readAt?: Date | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) expiresAt?: Date | null;
}

@ObjectType()
export class NotificationPageEntity {
  @Field(() => [NotificationEntity]) items!: NotificationEntity[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
  @Field(() => Int) unreadCount!: number;
}
