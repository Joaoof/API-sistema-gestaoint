import { Field, InputType, Int } from '@nestjs/graphql';
import { FiscalEnvironment, TaxRegime } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class UpsertCompanyFiscalConfigInput {
  @Field(() => FiscalEnvironment, { defaultValue: FiscalEnvironment.HOMOLOG })
  @IsEnum(FiscalEnvironment)
  ambiente!: FiscalEnvironment;

  @Field(() => TaxRegime, { defaultValue: TaxRegime.SIMPLES_NACIONAL })
  @IsEnum(TaxRegime)
  regimeTributario!: TaxRegime;

  @Field()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve conter exatamente 14 dígitos.' })
  cnpj!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  inscricaoEstadual?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  inscricaoMunicipal?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  razaoSocial?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nomeFantasia?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  endereco?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  numero?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  complemento?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  bairro?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  cidade?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(7, 7)
  codigoMunicipioIbge?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cep?: string;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  @Max(999)
  serieNfe!: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  proximoNumeroNfe!: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  @Max(999)
  serieNfce!: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  proximoNumeroNfce!: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  @Max(999)
  serieNfse!: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  proximoNumeroNfse!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cscNfce?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cscIdNfce?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  certificadoB64?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  certificadoSenha?: string;

  @Field({ nullable: true })
  @IsOptional()
  certificadoValidoAte?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  providerName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  providerApiToken?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  providerCnpjReference?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  providerWebhookSecret?: string;

  @Field({ defaultValue: true })
  @IsBoolean()
  ativo!: boolean;
}
