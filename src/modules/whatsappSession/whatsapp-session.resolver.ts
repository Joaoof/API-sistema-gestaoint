import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
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

@ObjectType()
class WebhookConfigResult {
  @Field() ok!: boolean;
  @Field(() => String, { nullable: true }) format?: string | null;
  @Field(() => String, { nullable: true }) webhookUrl?: string | null;
}

@Resolver(() => WhatsappInstanceEntity)
@UseGuards(GqlAuthGuard)
export class WhatsappSessionResolver {
  constructor(
    private readonly service: WhatsappSessionService,
    private readonly tenancy: TenancyService,
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
  ): Promise<WhatsappMessageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.sendText(companyId, to, body, customerId);
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
  async whatsappWebhookConfig(
    @CurrentUser() user: AuthUser,
  ): Promise<string> {
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
  async syncWhatsappContacts(
    @CurrentUser() user: AuthUser,
  ): Promise<number> {
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
}
