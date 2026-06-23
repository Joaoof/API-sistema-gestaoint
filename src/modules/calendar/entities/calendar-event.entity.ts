import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType()
export class CalendarReminderEntity {
  @Field(() => Int, { description: 'Minutos antes do evento' })
  offsetMin!: number;

  @Field(() => [String], {
    description: 'Canais a disparar: IN_APP, EMAIL, WHATSAPP, PUSH',
  })
  channels!: string[];
}

@ObjectType()
export class CalendarEventEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => String, { nullable: true }) userId?: string | null;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => String, { nullable: true }) location?: string | null;
  @Field() color!: string;
  @Field() allDay!: boolean;
  @Field(() => GraphQLISODateTime) startAt!: Date;
  @Field(() => GraphQLISODateTime) endAt!: Date;
  @Field() timezone!: string;
  @Field(() => String, { nullable: true, description: 'RRULE iCal RFC 5545' })
  rrule?: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  recurrenceUntil?: Date | null;
  @Field(() => String, { nullable: true }) category?: string | null;
  @Field() priority!: string;
  @Field(() => String, { nullable: true }) link?: string | null;
  @Field(() => [CalendarReminderEntity]) reminders!: CalendarReminderEntity[];
  @Field(() => [String]) channels!: string[];
  @Field(() => String, { nullable: true }) createdBy?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}

/**
 * Item unificado: o front recebe eventos do CalendarEvent (com RRULE expandida),
 * reminders, contas a pagar/receber, entregas, contratos e ordens — todos no mesmo
 * formato. `source` diz a origem; `sourceId` permite navegar pro registro.
 */
@ObjectType()
export class CalendarItemEntity {
  @Field(() => ID) id!: string;

  @Field({
    description:
      'EVENT | REMINDER | PAYABLE | RECEIVABLE | DELIVERY | CONTRACT | ORDER',
  })
  source!: string;

  @Field() sourceId!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Para séries de CalendarEvent expandidas, ID lógico da ocorrência (eventId + ISO)',
  })
  occurrenceId?: string | null;

  @Field() title!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field() color!: string;
  @Field() allDay!: boolean;
  @Field(() => GraphQLISODateTime) startAt!: Date;
  @Field(() => GraphQLISODateTime) endAt!: Date;

  @Field(() => String, {
    nullable: true,
    description: 'PENDING | OVERDUE | DONE | CANCELED',
  })
  status?: string | null;

  @Field(() => String, { nullable: true }) priority?: string | null;
  @Field(() => String, { nullable: true }) category?: string | null;
  @Field(() => String, { nullable: true }) link?: string | null;
  @Field(() => String, { nullable: true }) location?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Valor monetário (string para evitar problemas de precisão)',
  })
  amount?: string | null;

  @Field(() => Boolean) editable!: boolean;
}
