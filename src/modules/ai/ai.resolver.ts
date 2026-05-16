import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenancyService } from '../construction/shared/tenancy.service';
import {
  AiActionExecutionResult,
  AiChatResultEntity,
  AiConversationEntity,
  AiPendingActionFullEntity,
} from './entities/ai.entities';
import { AiChatService } from './use-cases/ai-chat.service';

@Resolver()
@UseGuards(GqlAuthGuard)
export class AiResolver {
  constructor(
    private readonly chat: AiChatService,
    private readonly tenancy: TenancyService,
    private readonly prisma: PrismaService,
  ) {}

  @Mutation(() => AiChatResultEntity)
  async chatWithAi(
    @CurrentUser() user: User,
    @Args('message') message: string,
    @Args('conversationId', { nullable: true }) conversationId?: string,
    @Args('model', { nullable: true }) model?: string,
  ): Promise<AiChatResultEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const result = await this.chat.chat({
      userId: user.id,
      companyId,
      conversationId,
      userMessage: message,
      model,
    });
    return {
      conversationId: result.conversationId,
      assistantMessage: result.assistantMessage,
      pendingActions: result.pendingActions.map((p) => ({
        id: p.id,
        tool: p.tool,
        description: p.description,
        paramsJson: JSON.stringify(p.params),
      })),
    };
  }

  @Mutation(() => AiActionExecutionResult)
  async executeAiAction(
    @CurrentUser() user: User,
    @Args('actionId') actionId: string,
  ): Promise<AiActionExecutionResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const out = await this.chat.executeAction(user.id, companyId, actionId);
    return {
      ok: out.ok,
      resultJson: out.result ? JSON.stringify(out.result) : null,
    };
  }

  @Mutation(() => Boolean)
  async cancelAiAction(@CurrentUser() user: User, @Args('actionId') actionId: string) {
    return this.chat.cancelAction(user.id, actionId);
  }

  /**
   * Lista AiPendingAction PENDENTES da empresa do usuário corrente.
   * Inclui ações criadas pelo bot do WhatsApp (channel='whatsapp', userId=null)
   * que qualquer admin pode aprovar pelo painel.
   */
  @Query(() => [AiPendingActionFullEntity])
  async aiPendingActions(
    @CurrentUser() user: User,
    @Args('channel', { nullable: true }) channel?: string,
  ): Promise<AiPendingActionFullEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.prisma.aiPendingAction.findMany({
      where: {
        companyId,
        status: 'PENDING',
        ...(channel ? { channel } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      tool: r.tool,
      description: r.description,
      paramsJson: JSON.stringify(r.params),
      status: r.status,
      channel: r.channel,
      peerNumber: r.peerNumber ?? null,
      userId: r.userId ?? null,
      conversationId: r.conversationId ?? null,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt ?? null,
      error: r.error ?? null,
    }));
  }

  @Query(() => [AiConversationEntity])
  async aiConversations(@CurrentUser() user: User): Promise<AiConversationEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.chat.listConversations(companyId, user.id);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      model: r.model,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  @Query(() => AiConversationEntity)
  async aiConversation(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<AiConversationEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const conv = await this.chat.getConversation(companyId, user.id, id);
    return {
      id: conv.id,
      title: conv.title,
      model: conv.model,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: conv.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolName: m.toolName ?? null,
          createdAt: m.createdAt,
        })),
    };
  }
}
