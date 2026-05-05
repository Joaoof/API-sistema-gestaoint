import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { NotificationChannel } from '@prisma/client';

@ObjectType()
export class NotificationTemplateEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field() key!: string;
  @Field(() => NotificationChannel) channel!: NotificationChannel;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) subject?: string | null;
  @Field() body!: string;
  @Field() active!: boolean;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}
