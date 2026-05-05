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
  @Field(() => String, { nullable: true }) customerId?: string | null;
  @Field(() => String, { nullable: true }) lastMessage?: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  lastMessageAt?: Date | null;
  @Field(() => Int) unreadCount!: number;
  @Field(() => Int) totalMessages!: number;
}

@ObjectType()
export class WhatsappMessageEntity {
  @Field(() => ID) id!: string;
  @Field() peerNumber!: string;
  @Field() fromMe!: boolean;
  @Field() body!: string;
  @Field() status!: string;
  @Field(() => String, { nullable: true }) externalId?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) sentAt?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  deliveredAt?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) readAt?: Date | null;
}
