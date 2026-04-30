import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class PaginationInput {
  @Field(() => Int, { defaultValue: 1 })
  @Min(1)
  page!: number;

  @Field(() => Int, { defaultValue: 50 })
  @Min(1)
  limit!: number;
}

@InputType()
export class CategoryFiltersInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@InputType()
export class CreateCategoryInput {
  @Field()
  @IsString()
  @MaxLength(120)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Field({ defaultValue: '#3B82F6' })
  @IsString()
  @IsHexColor()
  color!: string;

  @Field({ defaultValue: true })
  @IsBoolean()
  active!: boolean;
}

@InputType()
export class UpdateCategoryInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsHexColor()
  color?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
