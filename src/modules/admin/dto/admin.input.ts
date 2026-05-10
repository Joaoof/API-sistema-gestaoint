import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class AdminCreateUserInput {
  @Field() @IsString() @MaxLength(120) name!: string;
  @Field() @IsEmail() email!: string;
  @Field() @IsString() @MinLength(6) password!: string;
  @Field() @IsString() role!: string;
  @Field() @IsString() company_id!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() phone?: string;
  @Field({ nullable: true, defaultValue: false }) @IsOptional() @IsBoolean() isSuperAdmin?: boolean;
}

@InputType()
export class AdminUpdateUserInput {
  @Field() @IsString() id!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(120) name?: string;
  @Field({ nullable: true }) @IsOptional() @IsEmail() email?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() phone?: string | null;
  @Field({ nullable: true }) @IsOptional() @IsString() role?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() company_id?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() isSuperAdmin?: boolean;
}

@InputType()
export class AdminResetPasswordInput {
  @Field() @IsString() userId!: string;
  @Field() @IsString() @MinLength(6) newPassword!: string;
}

@InputType()
export class AdminCreatePlanInput {
  @Field() @IsString() @MaxLength(80) name!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() description?: string;
}

@InputType()
export class AdminUpdatePlanInput {
  @Field() @IsString() id!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(80) name?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() description?: string | null;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}

@InputType()
export class AdminCreateModuleInput {
  @Field() @IsString() @MaxLength(80) name!: string;
  @Field() @IsString() @MaxLength(80) module_key!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() description?: string;
}

@InputType()
export class AdminUpsertPlanModuleInput {
  @Field() @IsString() planId!: string;
  @Field() @IsString() moduleId!: string;
  @Field(() => [String]) permission!: string[];
  @Field({ nullable: true, defaultValue: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}

@InputType()
export class AdminAssignPlanInput {
  @Field() @IsString() companyId!: string;
  @Field() @IsString() planId!: string;
}
