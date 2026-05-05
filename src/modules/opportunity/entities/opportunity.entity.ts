import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  OpportunityActivityStatus,
  OpportunityActivityType,
  OpportunityStage,
} from '@prisma/client';

registerEnumType(OpportunityStage, { name: 'OpportunityStage' });
registerEnumType(OpportunityActivityType, { name: 'OpportunityActivityType' });
registerEnumType(OpportunityActivityStatus, {
  name: 'OpportunityActivityStatus',
});

@ObjectType()
export class OpportunityEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => String, { nullable: true }) customerId?: string | null;
  @Field(() => String, { nullable: true }) customerName?: string | null;
  @Field(() => String, { nullable: true }) customerPhone?: string | null;
  @Field(() => String, { nullable: true }) customerEmail?: string | null;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) source?: string | null;
  @Field(() => OpportunityStage) stage!: OpportunityStage;
  @Field(() => Float) value!: number;
  @Field(() => Int) probability!: number;
  @Field(() => GraphQLISODateTime, { nullable: true })
  expectedCloseDate?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) closedAt?: Date | null;
  @Field(() => String, { nullable: true }) ownerUserId?: string | null;
  @Field(() => String, { nullable: true }) sellerId?: string | null;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field(() => String, { nullable: true }) lostReason?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}

@ObjectType()
export class OpportunityActivityEntity {
  @Field(() => ID) id!: string;
  @Field() opportunityId!: string;
  @Field(() => OpportunityActivityType) type!: OpportunityActivityType;
  @Field(() => OpportunityActivityStatus) status!: OpportunityActivityStatus;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) dueDate?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) completedAt?: Date | null;
  @Field(() => String, { nullable: true }) assignedToUserId?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}

@ObjectType()
export class PipelineStageEntity {
  @Field(() => OpportunityStage) stage!: OpportunityStage;
  @Field(() => Int) count!: number;
  @Field(() => Float) totalValue!: number;
  @Field(() => [OpportunityEntity]) items!: OpportunityEntity[];
}
