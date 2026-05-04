import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { InvoiceType } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class IssueInvoiceItemInput {
  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  ordem!: number;

  @Field()
  @IsString()
  @MaxLength(60)
  codigo!: string;

  @Field()
  @IsString()
  @MaxLength(500)
  descricao!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  ncm?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  cfop?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  cest?: string;

  @Field({ defaultValue: 'UN' })
  @IsString()
  @MaxLength(6)
  unidade!: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  quantidade!: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  valorUnitario!: number;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  valorDesconto!: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  valorTotal!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  origemMercadoria?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  csosn?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  cstIcms?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  aliquotaIcms?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  productId?: string;
}

@InputType()
export class IssueInvoiceInput {
  @Field(() => InvoiceType, { defaultValue: InvoiceType.NFE })
  @IsEnum(InvoiceType)
  type!: InvoiceType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  orderId?: string;

  @Field({ defaultValue: 'Venda de mercadoria' })
  @IsString()
  @MaxLength(60)
  naturezaOperacao!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentMethod?: string;

  @Field()
  @IsString()
  @MaxLength(160)
  recipientName!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  recipientDocument?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  recipientAddress?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  recipientCity?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  recipientUf?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  recipientZip?: string;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  valorDesconto!: number;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  valorFrete!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;

  @Field(() => [IssueInvoiceItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IssueInvoiceItemInput)
  items!: IssueInvoiceItemInput[];
}

@InputType()
export class CancelInvoiceInput {
  @Field()
  @IsString()
  invoiceId!: string;

  @Field()
  @IsString()
  @MaxLength(255)
  motivo!: string;
}

@InputType()
export class ListInvoicesInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => InvoiceType, { nullable: true })
  @IsOptional()
  @IsEnum(InvoiceType)
  type?: InvoiceType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  status?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  orderId?: string;

  @Field(() => Int, { defaultValue: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  take!: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip!: number;
}
