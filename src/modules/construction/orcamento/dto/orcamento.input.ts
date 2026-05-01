import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

@InputType()
export class ItemOrcamentoInput {
  @Field({ nullable: true }) @IsOptional() @IsString() etapaId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() subetapaId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() itemWbsId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() centroCustoId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() categoriaId?: string;

  @Field() @IsString() @MaxLength(500) descricao!: string;
  @Field({ defaultValue: 'UN' }) @IsString() unidade!: string;
  @Field(() => Float) @IsNumber() @Min(0) quantidade!: number;
  @Field(() => Float) @IsNumber() @Min(0) valorUnitario!: number;
  @Field(() => Int, { defaultValue: 0 }) @IsInt() @Min(0) ordem!: number;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(1000) notas?: string;
}

@InputType()
export class CreateVersaoOrcamentoInput {
  @Field() @IsString() obraId!: string;
  @Field() @IsString() @MaxLength(160) nome!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(1000) descricao?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() baseVersaoId?: string;

  @Field(() => [ItemOrcamentoInput], { defaultValue: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemOrcamentoInput)
  itens!: ItemOrcamentoInput[];
}

@InputType()
export class AddItensOrcamentoInput {
  @Field() @IsString() versaoId!: string;
  @Field(() => [ItemOrcamentoInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemOrcamentoInput)
  itens!: ItemOrcamentoInput[];
}

@InputType()
export class CompararVersoesInput {
  @Field() @IsString() versaoBaseId!: string;
  @Field() @IsString() versaoAlvoId!: string;
}
