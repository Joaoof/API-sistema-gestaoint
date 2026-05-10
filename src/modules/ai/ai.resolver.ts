import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import {
  AiActionExecutionResult,
  AiChatResultEntity,
  AiConversationEntity,
} from './entities/ai.entities';
import { AiChatService } from './use-cases/ai-chat.service';

@Resolver()
@UseGuards(GqlAuthGuard)
export class AiResolver {
  constructor(
    private readonly chat: AiChatService,
    private readonly tenancy: TenancyService,
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

  @Query(() => [AiConversationEntity])
  async aiConversations(@CurrentUser() user: User): Promise<AiConversationEntity[]> {
    const rows = await this.chat.listConversations(user.id);
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
    const conv = await this.chat.getConversation(user.id, id);
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
