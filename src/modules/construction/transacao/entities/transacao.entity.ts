import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { StatusTransacao, TipoTransacao } from '@prisma/client';
import '../../shared/enums.gql';

@ObjectType()
export class TransacaoFinanceiraEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field() obraId!: string;
  @Field(() => String, { nullable: true }) etapaId?: string | null;
  @Field(() => String, { nullable: true }) subetapaId?: string | null;
  @Field(() => String, { nullable: true }) itemWbsId?: string | null;
  @Field() centroCustoId!: string;
  @Field() categoriaId!: string;
  @Field(() => String, { nullable: true }) supplierId?: string | null;
  @Field(() => String, { nullable: true }) accountPayableId?: string | null;
  @Field(() => String, { nullable: true }) accountReceivableId?: string | null;
  @Field(() => String, { nullable: true }) estornoDeId?: string | null;

  @Field(() => TipoTransacao) tipo!: TipoTransacao;
  @Field(() => StatusTransacao) status!: StatusTransacao;
  @Field(() => Float) valor!: number;
  @Field() descricao!: string;
  @Field(() => String, { nullable: true }) documento?: string | null;
  @Field(() => Date, { nullable: true }) dataReal?: Date | null;
  @Field() dataCompetencia!: Date;
  @Field(() => Date, { nullable: true }) dataPrevistaPgto?: Date | null;
  @Field(() => String, { nullable: true }) observacoes?: string | null;
  @Field(() => Date, { nullable: true }) confirmadoEm?: Date | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
