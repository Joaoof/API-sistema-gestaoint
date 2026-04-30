/* eslint-disable no-unused-vars */

import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

@ObjectType()
export class CompanyDto {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  nomeFantasia?: string;

  @Field(() => String, { nullable: true })
  razaoSocial?: string;

  @Field(() => String, { nullable: true })
  inscricaoEstadual?: string;

  @Field(() => String, { nullable: true })
  bairro?: string;

  @Field(() => String, { nullable: true })
  cidade?: string;

  @Field(() => String, { nullable: true })
  estado?: string;

  @Field(() => String, { nullable: true })
  cep?: string;

  @Field(() => Number, { nullable: true })
  latitude?: number;

  @Field(() => Number, { nullable: true })
  longitude?: number;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String, { nullable: true })
  cnpj?: string;

  @Field(() => String, { nullable: true })
  logoUrl?: string;
}

@InputType()
export class UpdateCompanyInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nomeFantasia?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  razaoSocial?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  inscricaoEstadual?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bairro?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cidade?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  estado?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  cep?: string;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  latitude?: number;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  longitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  cnpj?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}
