import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CompanyReminderEntity {
  @Field(() => ID) id!: string;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => String, {
    nullable: true,
    description: 'fiscal | financeiro | comercial | operacional | rh | outros',
  })
  category?: string | null;
  @Field({ description: 'low | normal | high | critical' })
  priority!: string;
  @Field(() => String, { nullable: true }) link?: string | null;
  @Field(() => GraphQLISODateTime) dueAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) doneAt?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) notifiedAt?: Date | null;
  @Field(() => String, { nullable: true }) createdBy?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}
