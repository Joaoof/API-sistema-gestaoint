import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FeatureDto {
  @Field() module_key!: string;
  @Field() name!: string;
  @Field() enabled!: boolean;
  /** 'plan' | 'override' | 'plan+override' */
  @Field() source!: string;
  @Field(() => [String]) permission!: string[];
  @Field() hasConfig!: boolean;
}

@ObjectType()
export class CompanyModuleOverrideDto {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field() module_key!: string;
  @Field() enabled!: boolean;
  @Field() hasConfig!: boolean;
  @Field() updatedAt!: Date;
}

@ObjectType()
export class PublicConfigFieldDto {
  @Field() key!: string;
  /** 'plain' | 'secret' */
  @Field() type!: string;
  /** Para `plain`: JSON.stringify do valor (ex: '"http://typebot.io/x"', '42', 'true'). */
  @Field(() => String, { nullable: true }) valueJson?: string | null;
  /** Para `secret`: indica se já existe valor salvo. */
  @Field({ nullable: true }) hasValue?: boolean;
  /** Para `secret`: dica visual tipo "••••••4f2a". */
  @Field(() => String, { nullable: true }) hint?: string | null;
}

@ObjectType()
export class TemplateModuleDto {
  @Field() module_key!: string;
  @Field() enabled!: boolean;
}

@ObjectType()
export class BusinessTemplateDtoGql {
  @Field(() => ID) id!: string;
  @Field() template_key!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => String, { nullable: true }) icon?: string | null;
  @Field() isActive!: boolean;
  @Field(() => [TemplateModuleDto]) modules!: TemplateModuleDto[];
}

@InputType()
export class ToggleCompanyModuleInput {
  @Field() companyId!: string;
  @Field() module_key!: string;
  @Field() enabled!: boolean;
}

@InputType()
export class SetCompanyModuleConfigInput {
  @Field() companyId!: string;
  @Field() module_key!: string;
  /** JSON serializado. Ex: '{"apiKey":"sk-...","model":"gpt-4o"}'. Campos sensíveis listados no backend são criptografados. */
  @Field() configJson!: string;
}

@InputType()
export class ApplyBusinessTemplateInput {
  @Field() companyId!: string;
  @Field() template_key!: string;
  @Field({ defaultValue: false }) replaceExisting!: boolean;
}
