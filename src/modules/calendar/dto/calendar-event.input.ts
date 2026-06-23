import { Field, GraphQLISODateTime, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CalendarReminderInput {
  @Field(() => Int) offsetMin!: number;

  @Field(() => [String], {
    description: 'IN_APP | EMAIL | WHATSAPP | PUSH',
  })
  channels!: string[];
}

@InputType()
export class CreateCalendarEventInput {
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => String, { nullable: true }) location?: string | null;
  @Field(() => String, { nullable: true }) color?: string | null;
  @Field(() => Boolean, { nullable: true }) allDay?: boolean | null;
  @Field(() => GraphQLISODateTime) startAt!: Date;
  @Field(() => GraphQLISODateTime) endAt!: Date;
  @Field(() => String, { nullable: true }) timezone?: string | null;
  @Field(() => String, { nullable: true, description: 'iCal RRULE (RFC 5545)' })
  rrule?: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  recurrenceUntil?: Date | null;
  @Field(() => String, { nullable: true }) category?: string | null;
  @Field(() => String, { nullable: true }) priority?: string | null;
  @Field(() => String, { nullable: true }) link?: string | null;
  @Field(() => String, { nullable: true }) userId?: string | null;
  @Field(() => [CalendarReminderInput], { nullable: true })
  reminders?: CalendarReminderInput[] | null;

  @Field(() => [String], {
    nullable: true,
    description: 'Canais padrão se um reminder não especificar',
  })
  channels?: string[] | null;
}

@InputType()
export class UpdateCalendarEventInput {
  @Field() id!: string;
  @Field(() => String, { nullable: true }) title?: string | null;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => String, { nullable: true }) location?: string | null;
  @Field(() => String, { nullable: true }) color?: string | null;
  @Field(() => Boolean, { nullable: true }) allDay?: boolean | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) startAt?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) endAt?: Date | null;
  @Field(() => String, { nullable: true }) timezone?: string | null;
  @Field(() => String, { nullable: true }) rrule?: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  recurrenceUntil?: Date | null;
  @Field(() => String, { nullable: true }) category?: string | null;
  @Field(() => String, { nullable: true }) priority?: string | null;
  @Field(() => String, { nullable: true }) link?: string | null;
  @Field(() => [CalendarReminderInput], { nullable: true })
  reminders?: CalendarReminderInput[] | null;
  @Field(() => [String], { nullable: true }) channels?: string[] | null;
}

@InputType()
export class CalendarRangeInput {
  @Field(() => GraphQLISODateTime) start!: Date;
  @Field(() => GraphQLISODateTime) end!: Date;

  @Field(() => [String], {
    nullable: true,
    description:
      'Filtrar fontes: EVENT, REMINDER, PAYABLE, RECEIVABLE, DELIVERY, CONTRACT, ORDER',
  })
  sources?: string[] | null;
}

@InputType()
export class PushSubscriptionInput {
  @Field() endpoint!: string;
  @Field() p256dh!: string;
  @Field() auth!: string;
  @Field(() => String, { nullable: true }) userAgent?: string | null;
}
