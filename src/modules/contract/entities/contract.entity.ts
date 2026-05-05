import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  BillingCycle,
  ContractEventType,
  ContractStatus,
  ServiceLevelKind,
} from '@prisma/client';

registerEnumType(ContractStatus, { name: 'ContractStatus' });
registerEnumType(BillingCycle, { name: 'BillingCycle' });
registerEnumType(ServiceLevelKind, { name: 'ServiceLevelKind' });
registerEnumType(ContractEventType, { name: 'ContractEventType' });

@ObjectType()
export class ContractEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field() customerId!: string;
  @Field() number!: string;
  @Field() title!: string;
  @Field(() => ContractStatus) status!: ContractStatus;
  @Field(() => GraphQLISODateTime, { nullable: true })
  startDate?: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  endDate?: Date | null;
  @Field(() => Float) value!: number;
  @Field(() => BillingCycle) billingCycle!: BillingCycle;
  @Field() autoRenew!: boolean;
  @Field(() => String, { nullable: true }) sellerId?: string | null;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => String, { nullable: true }) terms?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
  @Field(() => [ServiceLevelEntity], { nullable: true })
  serviceLevels?: ServiceLevelEntity[];
}

@ObjectType()
export class ServiceLevelEntity {
  @Field(() => ID) id!: string;
  @Field() contractId!: string;
  @Field(() => ServiceLevelKind) kind!: ServiceLevelKind;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => Float) targetValue!: number;
  @Field() unit!: string;
  @Field(() => Float) penaltyPercent!: number;
  @Field() active!: boolean;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}

@ObjectType()
export class ServiceLevelEventEntity {
  @Field(() => ID) id!: string;
  @Field() serviceLevelId!: string;
  @Field(() => GraphQLISODateTime) occurredAt!: Date;
  @Field(() => Float) measuredValue!: number;
  @Field() met!: boolean;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field(() => String, { nullable: true }) createdById?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}

@ObjectType()
export class ContractEventEntity {
  @Field(() => ID) id!: string;
  @Field() contractId!: string;
  @Field(() => ContractEventType) type!: ContractEventType;
  @Field(() => GraphQLISODateTime) occurredAt!: Date;
  @Field(() => String, { nullable: true }) notes?: string | null;
  @Field(() => String, { nullable: true }) createdById?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}
