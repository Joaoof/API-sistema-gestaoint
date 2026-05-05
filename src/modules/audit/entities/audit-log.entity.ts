import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { AuditAction } from '@prisma/client';

registerEnumType(AuditAction, { name: 'AuditAction' });

@ObjectType()
export class AuditLogEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => String, { nullable: true }) userId?: string | null;
  @Field(() => String, { nullable: true }) userName?: string | null;
  @Field(() => String, { nullable: true }) userEmail?: string | null;
  @Field() entity!: string;
  @Field() entityId!: string;
  @Field(() => AuditAction) action!: AuditAction;
  @Field(() => String, { nullable: true, description: 'JSON serializado do estado anterior' })
  beforeJson?: string | null;
  @Field(() => String, { nullable: true, description: 'JSON serializado do estado posterior' })
  afterJson?: string | null;
  @Field(() => String, { nullable: true }) reason?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}

@ObjectType()
export class AuditLogPageEntity {
  @Field(() => [AuditLogEntity]) items!: AuditLogEntity[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
}
