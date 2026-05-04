import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { FiscalEnvironment, InvoiceStatus, InvoiceType } from '@prisma/client';

registerEnumType(InvoiceType, { name: 'InvoiceType' });
registerEnumType(InvoiceStatus, { name: 'InvoiceStatus' });
registerEnumType(FiscalEnvironment, { name: 'FiscalEnvironment' });

@ObjectType()
export class InvoiceItemEntity {
  @Field(() => ID) id!: string;
  @Field(() => Int) ordem!: number;
  @Field() codigo!: string;
  @Field() descricao!: string;
  @Field(() => String, { nullable: true }) ncm?: string | null;
  @Field(() => String, { nullable: true }) cfop?: string | null;
  @Field(() => String, { nullable: true }) cest?: string | null;
  @Field() unidade!: string;
  @Field(() => Float) quantidade!: number;
  @Field(() => Float) valorUnitario!: number;
  @Field(() => Float) valorDesconto!: number;
  @Field(() => Float) valorTotal!: number;
  @Field(() => String, { nullable: true }) origemMercadoria?: string | null;
  @Field(() => String, { nullable: true }) csosn?: string | null;
  @Field(() => String, { nullable: true }) cstIcms?: string | null;
  @Field(() => Float, { nullable: true }) aliquotaIcms?: number | null;
  @Field(() => String, { nullable: true }) productId?: string | null;
}

@ObjectType()
export class InvoiceEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => String, { nullable: true }) userId?: string | null;
  @Field(() => String, { nullable: true }) orderId?: string | null;
  @Field(() => InvoiceType) type!: InvoiceType;
  @Field(() => InvoiceStatus) status!: InvoiceStatus;
  @Field(() => FiscalEnvironment) ambiente!: FiscalEnvironment;
  @Field(() => Int, { nullable: true }) numero?: number | null;
  @Field(() => Int, { nullable: true }) serie?: number | null;
  @Field(() => String, { nullable: true }) chaveAcesso?: string | null;
  @Field(() => String, { nullable: true }) protocoloAutorizacao?: string | null;
  @Field(() => String, { nullable: true }) protocoloCancelamento?: string | null;
  @Field(() => String, { nullable: true }) motivoCancelamento?: string | null;
  @Field(() => Date, { nullable: true }) dataEmissao?: Date | null;
  @Field(() => Date, { nullable: true }) dataAutorizacao?: Date | null;
  @Field(() => Date, { nullable: true }) dataCancelamento?: Date | null;
  @Field() recipientName!: string;
  @Field(() => String, { nullable: true }) recipientDocument?: string | null;
  @Field(() => String, { nullable: true }) recipientEmail?: string | null;
  @Field(() => String, { nullable: true }) recipientAddress?: string | null;
  @Field(() => String, { nullable: true }) recipientCity?: string | null;
  @Field(() => String, { nullable: true }) recipientUf?: string | null;
  @Field(() => String, { nullable: true }) recipientZip?: string | null;
  @Field() naturezaOperacao!: string;
  @Field(() => String, { nullable: true }) paymentMethod?: string | null;
  @Field(() => Float) valorProdutos!: number;
  @Field(() => Float) valorDesconto!: number;
  @Field(() => Float) valorFrete!: number;
  @Field(() => Float) valorTotal!: number;
  @Field(() => String, { nullable: true }) observacoes?: string | null;
  @Field(() => String, { nullable: true }) providerName?: string | null;
  @Field(() => String, { nullable: true }) providerRef?: string | null;
  @Field(() => String, { nullable: true }) xmlUrl?: string | null;
  @Field(() => String, { nullable: true }) danfeUrl?: string | null;
  @Field(() => String, { nullable: true }) errorMessage?: string | null;
  @Field(() => String, { nullable: true }) errorCode?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
  @Field(() => [InvoiceItemEntity]) items!: InvoiceItemEntity[];
}
