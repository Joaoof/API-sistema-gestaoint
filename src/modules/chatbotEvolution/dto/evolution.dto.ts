import { Field, GraphQLISODateTime, ID, InputType, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EvolutionStatusGqlDto {
  @Field() configured!: boolean;
  @Field(() => String, { nullable: true }) serverUrl!: string | null;
  @Field() hasApiKey!: boolean;
  @Field(() => String, { nullable: true }) apiKeyHint!: string | null;
  @Field(() => String, { nullable: true }) instanceName!: string | null;
  @Field() status!: string;
  @Field(() => String, { nullable: true }) connectionState!: string | null;
  @Field(() => String, { nullable: true }) phone!: string | null;
  @Field(() => String, { nullable: true }) profileName!: string | null;
  @Field(() => String, { nullable: true }) profilePicUrl!: string | null;
  @Field(() => String, { nullable: true }) qrCodeBase64!: string | null;
  @Field(() => String, { nullable: true }) webhookUrl!: string | null;
  @Field(() => String, { nullable: true }) webhookToken!: string | null;
  @Field(() => String, { nullable: true }) lastError!: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) lastSyncAt!: Date | null;
}

@InputType()
export class SaveEvolutionConfigInput {
  @Field() companyId!: string;
  @Field() serverUrl!: string;
  @Field({ nullable: true }) instanceName?: string;
  /** Manda apiKey plain text — back criptografa. Omita pra manter, '' pra apagar. */
  @Field({ nullable: true }) apiKey?: string;
}

@ObjectType()
export class EvolutionFlowGqlDto {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field() name!: string;
  /** keyword | regex | first_message | out_of_hours */
  @Field() trigger!: string;
  @Field(() => String, { nullable: true }) pattern!: string | null;
  @Field() responseBody!: string;
  @Field(() => Int) priority!: number;
  @Field() enabled!: boolean;
  @Field(() => Int) cooldownMinutes!: number;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}

@InputType()
export class CreateEvolutionFlowInput {
  @Field() companyId!: string;
  @Field() name!: string;
  @Field() trigger!: string;
  @Field({ nullable: true }) pattern?: string;
  @Field() responseBody!: string;
  @Field(() => Int, { nullable: true }) priority?: number;
  @Field({ nullable: true }) enabled?: boolean;
  @Field(() => Int, { nullable: true }) cooldownMinutes?: number;
}

@InputType()
export class UpdateEvolutionFlowInput {
  @Field() companyId!: string;
  @Field() id!: string;
  @Field({ nullable: true }) name?: string;
  @Field({ nullable: true }) trigger?: string;
  @Field({ nullable: true }) pattern?: string;
  @Field({ nullable: true }) responseBody?: string;
  @Field(() => Int, { nullable: true }) priority?: number;
  @Field({ nullable: true }) enabled?: boolean;
  @Field(() => Int, { nullable: true }) cooldownMinutes?: number;
}
