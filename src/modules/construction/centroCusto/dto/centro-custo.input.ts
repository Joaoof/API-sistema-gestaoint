import { Field, InputType } from '@nestjs/graphql';
import { CategoriaConstrucaoTipo } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import '../../shared/enums.gql';

@InputType()
export class CreateCentroCustoInput {
  @Field() @IsString() @MaxLength(40) codigo!: string;
  @Field() @IsString() @MaxLength(160) nome!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) descricao?: string;
}

@InputType()
export class UpdateCentroCustoInput {
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(160) nome?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) descricao?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() ativo?: boolean;
}

@InputType()
export class CreateCategoriaConstrucaoInput {
  @Field() @IsString() @MaxLength(40) codigo!: string;
  @Field() @IsString() @MaxLength(160) nome!: string;
  @Field(() => CategoriaConstrucaoTipo) @IsEnum(CategoriaConstrucaoTipo) tipo!: CategoriaConstrucaoTipo;
  @Field({ nullable: true }) @IsOptional() @IsString() parentId?: string;
}

@InputType()
export class UpdateCategoriaConstrucaoInput {
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(160) nome?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() ativo?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsString() parentId?: string;
}
