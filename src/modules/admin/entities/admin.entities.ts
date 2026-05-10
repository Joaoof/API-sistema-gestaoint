import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminUserEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() email!: string;
  @Field(() => String, { nullable: true }) phone?: string | null;
  @Field() role!: string;
  @Field() is_active!: boolean;
  @Field() isSuperAdmin!: boolean;
  @Field(() => String, { nullable: true }) company_id?: string | null;
  @Field(() => String, { nullable: true }) companyName?: string | null;
  @Field() createdAt!: Date;
}

@ObjectType()
export class AdminModuleEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() module_key!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
}

@ObjectType()
export class AdminPlanModuleEntity {
  @Field(() => ID) id!: string;
  @Field() planId!: string;
  @Field() moduleId!: string;
  @Field() isActive!: boolean;
  @Field(() => [String]) permission!: string[];
  @Field(() => AdminModuleEntity, { nullable: true }) module?: AdminModuleEntity | null;
}

@ObjectType()
export class AdminPlanEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field() isActive!: boolean;
  @Field(() => [AdminPlanModuleEntity]) modules!: AdminPlanModuleEntity[];
}

@ObjectType()
export class AdminCompanyEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) email?: string | null;
  @Field(() => Int) userCount!: number;
  @Field(() => String, { nullable: true }) currentPlanId?: string | null;
  @Field(() => String, { nullable: true }) currentPlanName?: string | null;
}
