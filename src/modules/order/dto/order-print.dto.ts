import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OrderPrintEmpresa {
  @Field(() => String, { nullable: true }) nome_fantasia?: string | null;
  @Field(() => String, { nullable: true }) razao_social?: string | null;
  @Field(() => String, { nullable: true }) cnpj?: string | null;
  @Field(() => String, { nullable: true }) inscricao_estadual?: string | null;
  @Field(() => String, { nullable: true }) endereco?: string | null;
  @Field(() => String, { nullable: true }) cidade?: string | null;
  @Field(() => String, { nullable: true }) estado?: string | null;
  @Field(() => String, { nullable: true }) telefone?: string | null;
}

@ObjectType()
export class OrderPrintCliente {
  @Field(() => String, { nullable: true }) nome?: string | null;
  @Field(() => String, { nullable: true }) cpf_cnpj?: string | null;
  @Field(() => String, { nullable: true }) telefone?: string | null;
  @Field(() => String, { nullable: true }) bairro?: string | null;
  @Field(() => String, { nullable: true }) cep?: string | null;
}

@ObjectType()
export class OrderPrintPedido {
  @Field(() => String) numero!: string;
  @Field(() => String) data_emissao!: string;
  @Field(() => String) hora_emissao!: string;
  @Field(() => String) forma_pagamento!: string;
  @Field(() => String, { nullable: true }) vencimento?: string | null;
  @Field(() => Float) valor_total!: number;
  @Field(() => Float) valor_bruto!: number;
  @Field(() => Float) desconto!: number;
  @Field(() => Int) itens_qtd!: number;
}

@ObjectType()
export class OrderPrintItem {
  @Field(() => String, { nullable: true }) codigo?: string | null;
  @Field() descricao!: string;
  @Field(() => String, { nullable: true }) marca?: string | null;
  @Field() unidade!: string;
  @Field(() => Float) quantidade!: number;
  @Field(() => Float) valor_unitario!: number;
  @Field(() => Float) desconto!: number;
  @Field(() => Float) valor_total!: number;
}

@ObjectType()
export class OrderPrintDto {
  @Field(() => OrderPrintEmpresa) empresa!: OrderPrintEmpresa;
  @Field(() => OrderPrintCliente) cliente!: OrderPrintCliente;
  @Field(() => OrderPrintPedido) pedido!: OrderPrintPedido;
  @Field(() => [OrderPrintItem]) itens!: OrderPrintItem[];
  @Field(() => String, { nullable: true }) vendedor?: string | null;
  @Field(() => String, { nullable: true }) observacoes?: string | null;
}
