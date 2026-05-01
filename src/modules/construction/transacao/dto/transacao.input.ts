import { Field, Float, InputType } from '@nestjs/graphql';
import { StatusTransacao, TipoTransacao } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import '../../shared/enums.gql';
import { TipoData } from '../../shared/enums.gql';

@InputType()
export class CreateTransacaoInput {
  @Field() @IsString() obraId!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() etapaId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() subetapaId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() itemWbsId?: string;
  @Field() @IsString() centroCustoId!: string;
  @Field() @IsString() categoriaId!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() supplierId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() accountPayableId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() accountReceivableId?: string;

  @Field(() => TipoTransacao) @IsEnum(TipoTransacao) tipo!: TipoTransacao;

  @Field(() => Float) @IsNumber() @Min(0.01) valor!: number;

  @Field() @IsString() @MaxLength(500) descricao!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(80) documento?: string;

  @Field() dataCompetencia!: Date;
  @Field(() => Date, { nullable: true }) @IsOptional() dataReal?: Date;
  @Field(() => Date, { nullable: true }) @IsOptional() dataPrevistaPgto?: Date;

  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(2000) observacoes?: string;

  @Field(() => StatusTransacao, { defaultValue: StatusTransacao.PENDENTE })
  @IsEnum(StatusTransacao)
  status!: StatusTransacao;
}

@InputType()
export class ConfirmarTransacaoInput {
  @Field() @IsString() id!: string;
  @Field() dataReal!: Date;
}

@InputType()
export class EstornarTransacaoInput {
  @Field() @IsString() id!: string;
  @Field() @IsString() @MaxLength(500) motivo!: string;
}

@InputType()
export class ListTransacoesFilterInput {
  @Field({ nullable: true }) @IsOptional() @IsString() obraId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() centroCustoId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() categoriaId?: string;
  @Field(() => TipoTransacao, { nullable: true }) @IsOptional() @IsEnum(TipoTransacao) tipo?: TipoTransacao;
  @Field(() => StatusTransacao, { nullable: true }) @IsOptional() @IsEnum(StatusTransacao) status?: StatusTransacao;
  @Field(() => Date, { nullable: true }) @IsOptional() dataInicio?: Date;
  @Field(() => Date, { nullable: true }) @IsOptional() dataFim?: Date;
  @Field(() => TipoData, { defaultValue: TipoData.COMPETENCIA })
  @IsEnum(TipoData)
  tipoData!: TipoData;
}
