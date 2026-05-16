import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AiPendingActionEntity {
  @Field(() => ID) id!: string;
  @Field() tool!: string;
  @Field() description!: string;
  @Field(() => String, {
    description: 'JSON string com os parâmetros que serão executados',
  })
  paramsJson!: string;
}

@ObjectType()
export class AiAssistantMessageEntity {
  @Field(() => ID) id!: string;
  @Field() content!: string;
  @Field() createdAt!: Date;
}

@ObjectType()
export class AiChatResultEntity {
  @Field() conversationId!: string;
  @Field(() => AiAssistantMessageEntity) assistantMessage!: AiAssistantMessageEntity;
  @Field(() => [AiPendingActionEntity]) pendingActions!: AiPendingActionEntity[];
}

@ObjectType()
export class AiMessageEntity {
  @Field(() => ID) id!: string;
  @Field() role!: string;
  @Field() content!: string;
  @Field(() => String, { nullable: true }) toolName?: string | null;
  @Field() createdAt!: Date;
}

@ObjectType()
export class AiConversationEntity {
  @Field(() => ID) id!: string;
  @Field(() => String, { nullable: true }) title?: string | null;
  @Field() model!: string;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
  @Field(() => [AiMessageEntity], { nullable: true }) messages?: AiMessageEntity[];
}

@ObjectType()
export class AiActionExecutionResult {
  @Field() ok!: boolean;
  @Field(() => String, { nullable: true })
  resultJson?: string | null;
}

@ObjectType()
export class AiPendingActionFullEntity {
  @Field(() => ID) id!: string;
  @Field() tool!: string;
  @Field() description!: string;
  @Field(() => String) paramsJson!: string;
  @Field() status!: string;
  @Field() channel!: string; // 'web' | 'whatsapp'
  @Field(() => String, { nullable: true }) peerNumber?: string | null;
  @Field(() => String, { nullable: true }) userId?: string | null;
  @Field(() => String, { nullable: true }) conversationId?: string | null;
  @Field() createdAt!: Date;
  @Field(() => Date, { nullable: true }) resolvedAt?: Date | null;
  @Field(() => String, { nullable: true }) error?: string | null;
}
