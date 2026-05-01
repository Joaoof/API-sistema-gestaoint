import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { VersaoOrcamentoStatus } from '@prisma/client';
import '../../shared/enums.gql';

@ObjectType()
export class ItemOrcamentoEntity {
  @Field(() => ID) id!: string;
  @Field() versaoId!: string;
  @Field(() => String, { nullable: true }) etapaId?: string | null;
  @Field(() => String, { nullable: true }) subetapaId?: string | null;
  @Field(() => String, { nullable: true }) itemWbsId?: string | null;
  @Field(() => String, { nullable: true }) centroCustoId?: string | null;
  @Field(() => String, { nullable: true }) categoriaId?: string | null;
  @Field() descricao!: string;
  @Field() unidade!: string;
  @Field(() => Float) quantidade!: number;
  @Field(() => Float) valorUnitario!: number;
  @Field(() => Float) valorTotal!: number;
  @Field(() => Int) ordem!: number;
  @Field(() => String, { nullable: true }) notas?: string | null;
}

@ObjectType()
export class VersaoOrcamentoEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field() obraId!: string;
  @Field(() => Int) numero!: number;
  @Field() nome!: string;
  @Field(() => String, { nullable: true }) descricao?: string | null;
  @Field(() => VersaoOrcamentoStatus) status!: VersaoOrcamentoStatus;
  @Field(() => String, { nullable: true }) baseVersaoId?: string | null;
  @Field(() => Float) total!: number;
  @Field(() => Date, { nullable: true }) ativadoEm?: Date | null;
  @Field(() => Date, { nullable: true }) congeladoEm?: Date | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
  @Field(() => [ItemOrcamentoEntity], { nullable: true }) itens?: ItemOrcamentoEntity[];
}

@ObjectType()
export class ComparacaoItemEntity {
  @Field() descricao!: string;
  @Field(() => String, { nullable: true }) etapaId?: string | null;
  @Field(() => String, { nullable: true }) categoriaId?: string | null;
  @Field(() => Float) valorBase!: number;
  @Field(() => Float) valorAlvo!: number;
  @Field(() => Float) diferencaAbs!: number;
  @Field(() => Float, { nullable: true }) diferencaPct?: number | null;
}

@ObjectType()
export class ComparacaoVersoesEntity {
  @Field() versaoBaseId!: string;
  @Field() versaoAlvoId!: string;
  @Field(() => Float) totalBase!: number;
  @Field(() => Float) totalAlvo!: number;
  @Field(() => Float) diferencaAbs!: number;
  @Field(() => Float, { nullable: true }) diferencaPct?: number | null;
  @Field(() => [ComparacaoItemEntity]) porEtapa!: ComparacaoItemEntity[];
  @Field(() => [ComparacaoItemEntity]) porCategoria!: ComparacaoItemEntity[];
}
