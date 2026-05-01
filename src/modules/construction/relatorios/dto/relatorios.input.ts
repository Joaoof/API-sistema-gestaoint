import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoData } from '../../shared/enums.gql';

export enum GranularidadeFluxo {
  DIA = 'DIA',
  SEMANA = 'SEMANA',
  MES = 'MES',
}
import { registerEnumType } from '@nestjs/graphql';
registerEnumType(GranularidadeFluxo, { name: 'GranularidadeFluxo' });

@InputType()
export class RelatorioFiltroInput {
  @Field({ nullable: true }) @IsOptional() @IsString() obraId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() etapaId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() centroCustoId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() categoriaId?: string;
  @Field(() => Date, { nullable: true }) @IsOptional() dataInicio?: Date;
  @Field(() => Date, { nullable: true }) @IsOptional() dataFim?: Date;
  @Field(() => TipoData, { defaultValue: TipoData.COMPETENCIA })
  @IsEnum(TipoData)
  tipoData!: TipoData;
}

@InputType()
export class RelatorioFluxoCaixaInput {
  @Field({ nullable: true }) @IsOptional() @IsString() obraId?: string;
  @Field(() => Date) dataInicio!: Date;
  @Field(() => Date) dataFim!: Date;
  @Field(() => GranularidadeFluxo, { defaultValue: GranularidadeFluxo.MES })
  @IsEnum(GranularidadeFluxo)
  granularidade!: GranularidadeFluxo;
  @Field(() => TipoData, { defaultValue: TipoData.COMPETENCIA })
  @IsEnum(TipoData)
  tipoData!: TipoData;
}
