import { Field, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreateExportTemplateInput {
  @Field() @IsString() @MaxLength(80) name!: string;
  @Field() @IsString() @IsIn(['sales', 'receivables', 'payables', 'movements', 'inventory', 'orders'])
  module!: string;
  @Field() @IsString() @IsIn(['CSV', 'XLSX', 'PDF']) format!: string;

  @Field(() => String, { description: 'JSON string com filtros' })
  @IsString()
  filtersJson!: string;

  @Field(() => [String]) @IsArray() columns!: string[];

  @Field(() => String, { nullable: true }) @IsOptional() @IsString() schedule?: string | null;
}

@InputType()
export class UpdateExportTemplateInput {
  @Field() @IsString() id!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() name?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() module?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() format?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() filtersJson?: string;
  @Field(() => [String], { nullable: true }) @IsOptional() @IsArray() columns?: string[];
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() schedule?: string | null;
}
