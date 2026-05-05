import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  Float,
  GraphQLISODateTime,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import {
  WhatsappContactEntity,
  WhatsappConversationEntity,
  WhatsappInstanceEntity,
  WhatsappMessageEntity,
} from './entities/whatsapp-session.entity';
import { WhatsappSessionService } from './use-cases/whatsapp-session.service';
import {
  WhatsappPubSubService,
  WHATSAPP_MESSAGE_RECEIVED,
  WHATSAPP_MESSAGE_UPDATED,
  WHATSAPP_PRESENCE_CHANGED,
} from './use-cases/whatsapp-pubsub';

@ObjectType()
class WebhookConfigResult {
  @Field() ok!: boolean;
  @Field(() => String, { nullable: true }) format?: string | null;
  @Field(() => String, { nullable: true }) webhookUrl?: string | null;
}

@InputType()
class WhatsappMediaInput {
  @Field(() => String, {
    nullable: true,
    description: 'URL pública pra WAHA baixar',
  })
  url?: string;
  @Field(() => String, {
    nullable: true,
    description: 'Conteúdo em base64 (sem prefixo data:)',
  })
  data?: string;
  @Field(() => String, { nullable: true }) mimetype?: string;
  @Field(() => String, { nullable: true }) filename?: string;
}

@ObjectType()
class WhatsappPresenceResult {
  @Field(() => String, { nullable: true }) presence?: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) lastSeen?: Date | null;
}

@ObjectType()
class WhatsappCheckExistsResult {
  @Field() exists!: boolean;
  @Field(() => String, { nullable: true }) chatId?: string | null;
}

@ObjectType()
class WhatsappGroupParticipant {
  @Field() jid!: string;
  @Field() phone!: string;
  @Field() isAdmin!: boolean;
}

@ObjectType()
class WhatsappPresenceUpdate {
  @Field() peerNumber!: string;
  @Field(() => String, { nullable: true }) presence?: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) lastSeen?: Date | null;
}

@Resolver(() => WhatsappInstanceEntity)
@UseGuards(GqlAuthGuard)
export class WhatsappSessionResolver {
  constructor(
    private readonly service: WhatsappSessionService,
    private readonly tenancy: TenancyService,
    private readonly pubsub: WhatsappPubSubService,
  ) {}

  @Query(() => WhatsappInstanceEntity)
  async whatsappSession(
    @CurrentUser() user: AuthUser,
  ): Promise<WhatsappInstanceEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.refreshStatus(companyId);
  }

  @Query(() => [WhatsappConversationEntity])
  async whatsappConversations(
    @CurrentUser() user: AuthUser,
  ): Promise<WhatsappConversationEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.listConversations(companyId);
  }

  @Query(() => WhatsappContactEntity)
  async whatsappContact(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
  ): Promise<WhatsappContactEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.getContact(companyId, peerNumber);
  }

  @Query(() => [WhatsappMessageEntity])
  async whatsappMessages(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<WhatsappMessageEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.listMessages(companyId, peerNumber, limit ?? 200);
  }

  @Mutation(() => WhatsappInstanceEntity)
  async connectWhatsapp(
    @CurrentUser() user: AuthUser,
  ): Promise<WhatsappInstanceEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.connect(companyId);
  }

  @Mutation(() => WhatsappInstanceEntity)
  async disconnectWhatsapp(
    @CurrentUser() user: AuthUser,
  ): Promise<WhatsappInstanceEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.disconnect(companyId);
  }

  @Mutation(() => WhatsappMessageEntity)
  async sendWhatsappMessage(
    @CurrentUser() user: AuthUser,
    @Args('to') to: string,
    @Args('body') body: string,
    @Args('customerId', { nullable: true }) customerId?: string,
    @Args('replyTo', { nullable: true }) replyTo?: string,
    @Args('mentions', { nullable: true, type: () => [String] })
    mentions?: string[],
  ): Promise<WhatsappMessageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.sendText(companyId, to, body, customerId, {
      replyTo,
      mentions,
    });
  }

  @Mutation(() => Int)
  async markWhatsappConversationRead(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
  ): Promise<number> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.markConversationRead(companyId, peerNumber);
  }

  @Mutation(() => WebhookConfigResult)
  async reconfigureWhatsappWebhook(
    @CurrentUser() user: AuthUser,
  ): Promise<WebhookConfigResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.reconfigureWebhook(companyId);
  }

  @Query(() => String)
  async whatsappWebhookConfig(@CurrentUser() user: AuthUser): Promise<string> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.getWebhookConfigFromEvolution(companyId);
  }

  @Mutation(() => Int)
  async syncWhatsappFromEvolution(
    @CurrentUser() user: AuthUser,
  ): Promise<number> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.syncFromEvolution(companyId);
  }

  @Mutation(() => Int)
  async syncWhatsappContacts(@CurrentUser() user: AuthUser): Promise<number> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.syncContactsFromWaha(companyId);
  }

  @Mutation(() => Int)
  async syncWhatsappMessagesForPeer(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<number> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.syncMessagesForPeer(
      companyId,
      peerNumber,
      limit ?? 200,
    );
  }

  @Mutation(() => Int)
  async linkCustomerToWhatsappContact(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
    @Args('customerId') customerId: string,
  ): Promise<number> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.linkCustomerToWhatsappContact(
      companyId,
      peerNumber,
      customerId,
    );
  }

  @Mutation(() => Int)
  async unlinkCustomerFromWhatsappContact(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
  ): Promise<number> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.unlinkCustomerFromWhatsappContact(
      companyId,
      peerNumber,
    );
  }

  // ============ Phase 2: send media / reply / mention / reaction ============

  @Mutation(() => WhatsappMessageEntity)
  async sendWhatsappImage(
    @CurrentUser() user: AuthUser,
    @Args('to') to: string,
    @Args('file') file: WhatsappMediaInput,
    @Args('caption', { nullable: true }) caption?: string,
    @Args('replyTo', { nullable: true }) replyTo?: string,
    @Args('customerId', { nullable: true }) customerId?: string,
  ): Promise<WhatsappMessageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.sendMedia(companyId, to, 'image', file, {
      caption,
      replyTo,
      customerId,
    });
  }

  @Mutation(() => WhatsappMessageEntity)
  async sendWhatsappVideo(
    @CurrentUser() user: AuthUser,
    @Args('to') to: string,
    @Args('file') file: WhatsappMediaInput,
    @Args('caption', { nullable: true }) caption?: string,
    @Args('replyTo', { nullable: true }) replyTo?: string,
    @Args('customerId', { nullable: true }) customerId?: string,
  ): Promise<WhatsappMessageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.sendMedia(companyId, to, 'video', file, {
      caption,
      replyTo,
      customerId,
    });
  }

  @Mutation(() => WhatsappMessageEntity)
  async sendWhatsappVoice(
    @CurrentUser() user: AuthUser,
    @Args('to') to: string,
    @Args('file') file: WhatsappMediaInput,
    @Args('replyTo', { nullable: true }) replyTo?: string,
    @Args('customerId', { nullable: true }) customerId?: string,
  ): Promise<WhatsappMessageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.sendMedia(companyId, to, 'voice', file, {
      replyTo,
      customerId,
    });
  }

  @Mutation(() => WhatsappMessageEntity)
  async sendWhatsappFile(
    @CurrentUser() user: AuthUser,
    @Args('to') to: string,
    @Args('file') file: WhatsappMediaInput,
    @Args('caption', { nullable: true }) caption?: string,
    @Args('replyTo', { nullable: true }) replyTo?: string,
    @Args('customerId', { nullable: true }) customerId?: string,
  ): Promise<WhatsappMessageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.sendMedia(companyId, to, 'file', file, {
      caption,
      replyTo,
      customerId,
    });
  }

  @Mutation(() => WhatsappMessageEntity)
  async sendWhatsappLocation(
    @CurrentUser() user: AuthUser,
    @Args('to') to: string,
    @Args('latitude', { type: () => Float }) latitude: number,
    @Args('longitude', { type: () => Float }) longitude: number,
    @Args('title', { nullable: true }) title?: string,
  ): Promise<WhatsappMessageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.sendLocation(companyId, to, latitude, longitude, title);
  }

  @Mutation(() => Boolean)
  async reactToWhatsappMessage(
    @CurrentUser() user: AuthUser,
    @Args('messageId') messageId: string,
    @Args('reaction') reaction: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.reactToMessage(companyId, messageId, reaction);
  }

  // ============ Phase 3: typing / presence ============

  @Mutation(() => Boolean)
  async setWhatsappTyping(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
    @Args('typing') typing: boolean,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.setTyping(companyId, peerNumber, typing);
  }

  @Query(() => WhatsappPresenceResult, { nullable: true })
  async whatsappPeerPresence(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
  ): Promise<WhatsappPresenceResult | null> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.getPeerPresence(companyId, peerNumber);
  }

  // ============ Phase 4: CRM panel ============

  @Query(() => String, { nullable: true })
  async whatsappContactAbout(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
  ): Promise<string | null> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.getContactAbout(companyId, peerNumber);
  }

  @Query(() => WhatsappCheckExistsResult)
  async checkWhatsappNumber(
    @CurrentUser() user: AuthUser,
    @Args('phone') phone: string,
  ): Promise<WhatsappCheckExistsResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.checkPhoneOnWhatsapp(companyId, phone);
  }

  @Mutation(() => Boolean)
  async blockWhatsappContact(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
    @Args('block') block: boolean,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.blockContact(companyId, peerNumber, block);
  }

  @Query(() => [WhatsappGroupParticipant])
  async whatsappGroupParticipants(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
  ): Promise<WhatsappGroupParticipant[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.getGroupParticipants(companyId, peerNumber);
  }

  // ============ Phase 5: Edit / delete / star / pin / forward ============

  @Mutation(() => WhatsappMessageEntity)
  async editWhatsappMessage(
    @CurrentUser() user: AuthUser,
    @Args('messageId') messageId: string,
    @Args('newBody') newBody: string,
  ): Promise<WhatsappMessageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.editWhatsappMessage(companyId, messageId, newBody);
  }

  @Mutation(() => Boolean)
  async deleteWhatsappMessage(
    @CurrentUser() user: AuthUser,
    @Args('messageId') messageId: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.deleteWhatsappMessage(companyId, messageId);
  }

  @Mutation(() => Boolean)
  async starWhatsappMessage(
    @CurrentUser() user: AuthUser,
    @Args('messageId') messageId: string,
    @Args('star') star: boolean,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.starWhatsappMessage(companyId, messageId, star);
  }

  @Mutation(() => Boolean)
  async pinWhatsappMessage(
    @CurrentUser() user: AuthUser,
    @Args('messageId') messageId: string,
    @Args('pin') pin: boolean,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.pinWhatsappMessage(companyId, messageId, pin);
  }

  @Mutation(() => WhatsappMessageEntity)
  async forwardWhatsappMessage(
    @CurrentUser() user: AuthUser,
    @Args('messageId') messageId: string,
    @Args('toPeerNumber') toPeerNumber: string,
  ): Promise<WhatsappMessageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.forwardWhatsappMessage(
      companyId,
      messageId,
      toPeerNumber,
    );
  }

  @Mutation(() => Boolean)
  async archiveWhatsappChat(
    @CurrentUser() user: AuthUser,
    @Args('peerNumber') peerNumber: string,
    @Args('archive') archive: boolean,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.archiveWhatsappChat(companyId, peerNumber, archive);
  }

  // ============ Subscriptions (tempo real) ============

  @Subscription(() => WhatsappMessageEntity, {
    name: 'whatsappMessageReceived',
    filter: (
      payload: { whatsappMessageReceived: { companyId: string } },
      _vars: unknown,
      ctx: { user?: { companyId?: string } },
    ) =>
      ctx?.user?.companyId === payload.whatsappMessageReceived.companyId ||
      true,
  })
  whatsappMessageReceived() {
    return this.pubsub.asyncIterator(WHATSAPP_MESSAGE_RECEIVED);
  }

  @Subscription(() => WhatsappMessageEntity, {
    name: 'whatsappMessageUpdated',
  })
  whatsappMessageUpdated() {
    return this.pubsub.asyncIterator(WHATSAPP_MESSAGE_UPDATED);
  }

  @Subscription(() => WhatsappPresenceUpdate, {
    name: 'whatsappPresenceChanged',
    filter: (
      payload: { whatsappPresenceChanged: { peerNumber: string } },
      vars: { peerNumber?: string },
    ) =>
      !vars.peerNumber ||
      payload.whatsappPresenceChanged.peerNumber === vars.peerNumber,
  })
  whatsappPresenceChanged(
    @Args('peerNumber', { nullable: true }) _peerNumber?: string,
  ) {
    return this.pubsub.asyncIterator(WHATSAPP_PRESENCE_CHANGED);
  }
}
