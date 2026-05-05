import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { WhatsappInstanceStatus } from '@prisma/client';

registerEnumType(WhatsappInstanceStatus, { name: 'WhatsappInstanceStatus' });

@ObjectType()
export class WhatsappInstanceEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field() instanceName!: string;
  @Field(() => WhatsappInstanceStatus) status!: WhatsappInstanceStatus;
  @Field(() => String, { nullable: true, description: 'PNG base64 (data URL)' })
  qrCode?: string | null;
  @Field(() => String, { nullable: true }) phone?: string | null;
  @Field(() => String, { nullable: true }) profileName?: string | null;
  @Field(() => String, { nullable: true }) profilePicUrl?: string | null;
  @Field(() => String, { nullable: true }) lastError?: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) lastSeenAt?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  connectedAt?: Date | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}

@ObjectType()
export class WhatsappConversationEntity {
  @Field() peerNumber!: string;
  @Field(() => String, { nullable: true }) peerName?: string | null;
  @Field(() => String, { nullable: true }) profilePicUrl?: string | null;
  @Field(() => String, { nullable: true }) customerId?: string | null;
  @Field(() => String, { nullable: true }) lastMessage?: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  lastMessageAt?: Date | null;
  @Field(() => Int) unreadCount!: number;
  @Field(() => Int) totalMessages!: number;
  @Field() isGroup!: boolean;
  @Field({ description: 'Contato @lid — telefone oculto pela privacidade do WhatsApp' })
  isHiddenNumber!: boolean;
}

@ObjectType()
export class WhatsappContactEntity {
  @Field() peerNumber!: string;
  @Field() displayName!: string;
  @Field(() => String, { nullable: true }) phoneFormatted?: string | null;
  @Field() isGroup!: boolean;
  @Field(() => String, { nullable: true }) profilePicUrl?: string | null;
  @Field(() => String, { nullable: true }) about?: string | null;
  @Field() isBusiness!: boolean;
  @Field(() => String, { nullable: true }) verifiedName?: string | null;
  @Field(() => String, { nullable: true }) businessCategory?: string | null;
  @Field(() => String, { nullable: true }) businessDescription?: string | null;
  @Field(() => String, { nullable: true }) customerId?: string | null;
  @Field(() => String, { nullable: true }) customerName?: string | null;
  @Field(() => Int) totalMessages!: number;
  @Field(() => Int) inboundCount!: number;
  @Field(() => Int) outboundCount!: number;
  @Field(() => GraphQLISODateTime, { nullable: true })
  firstMessageAt?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  lastMessageAt?: Date | null;
  @Field() waLink!: string;

  // ===== Métricas avançadas =====
  @Field(() => Int, { description: 'Mensagens últimos 7 dias' })
  messages7d!: number;
  @Field(() => Int, { description: 'Mensagens últimos 30 dias' })
  messages30d!: number;
  @Field(() => Int, { description: 'Dias desde o último contato' })
  daysSinceLastMessage!: number;
  @Field(() => Int, {
    description: 'Tempo médio de resposta em minutos (mediana das últimas 50 trocas)',
    nullable: true,
  })
  avgResponseMinutes?: number | null;
  @Field(() => Int, {
    description: 'Mensagens enviadas sem retorno (sequência atual)',
  })
  unansweredOutbound!: number;
  @Field(() => Int, {
    description: 'Quantidade de anexos enviados/recebidos',
  })
  mediaCount!: number;
  @Field(() => Int, {
    description: 'Quantidade de chamadas (recebidas/feitas)',
  })
  callCount!: number;
  @Field(() => GraphQLISODateTime, { nullable: true })
  picFetchedAt?: Date | null;
  @Field(() => Boolean, {
    description: 'Saudação automática deve ser oferecida (sem mensagens últimas 24h)',
  })
  shouldGreet!: boolean;

  // ===== Tags / labels / notas (interno do CRM) =====
  @Field(() => [String]) tags!: string[];
  @Field(() => String, { nullable: true })
  internalNotes?: string | null;
  @Field(() => String, {
    nullable: true,
    description: 'open | pending | resolved | snoozed',
  })
  conversationStatus?: string | null;
  @Field(() => String, { nullable: true })
  assignedUserId?: string | null;
  @Field(() => String, { nullable: true })
  assignedUserName?: string | null;
}

@ObjectType()
export class WhatsappActivityEvent {
  @Field() id!: string;
  @Field({
    description: 'message | call | reaction | revoked | edited | linked | unlinked | block | tag | note',
  })
  type!: string;
  @Field(() => GraphQLISODateTime) at!: Date;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => String, { nullable: true }) actor?: string | null;
  @Field(() => String, { nullable: true }) icon?: string | null;
}

@ObjectType()
export class WhatsappReminderEntity {
  @Field(() => ID) id!: string;
  @Field() peerNumber!: string;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => String, { nullable: true }) tag?: string | null;
  @Field(() => GraphQLISODateTime) dueAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) doneAt?: Date | null;
  @Field(() => String, { nullable: true }) createdBy?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}

@ObjectType()
export class WhatsappMediaSummary {
  @Field(() => Int) images!: number;
  @Field(() => Int) videos!: number;
  @Field(() => Int) audios!: number;
  @Field(() => Int) documents!: number;
  @Field(() => Int) stickers!: number;
  @Field(() => Int) locations!: number;
}

@ObjectType()
export class WhatsappMessageEntity {
  @Field(() => ID) id!: string;
  @Field() peerNumber!: string;
  @Field() fromMe!: boolean;
  @Field() body!: string;
  @Field() status!: string;
  @Field(() => String, { nullable: true }) externalId?: string | null;
  @Field(() => String, { nullable: true })
  participantNumber?: string | null;
  @Field(() => String, { nullable: true })
  participantName?: string | null;
  @Field(() => String, {
    nullable: true,
    description: 'sticker | image | video | audio | ptt | document | location | contact',
  })
  mediaType?: string | null;
  @Field(() => String, { nullable: true }) mediaUrl?: string | null;
  @Field(() => String, { nullable: true }) mediaMimetype?: string | null;
  @Field(() => String, { nullable: true }) quotedMessageId?: string | null;
  @Field(() => String, { nullable: true }) quotedBody?: string | null;
  @Field(() => String, { nullable: true }) quotedParticipant?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) sentAt?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  deliveredAt?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) readAt?: Date | null;
}
