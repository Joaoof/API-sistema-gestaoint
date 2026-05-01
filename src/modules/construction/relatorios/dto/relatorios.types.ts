import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import '../../shared/enums.gql';

@ObjectType()
export class LinhaPrevistoVsRealizado {
  @Field(() => String, { nullable: true }) chaveId?: string | null;
  @Field() chaveNome!: string;
  @Field(() => Float) previsto!: number;
  @Field(() => Float) realizado!: number;
  @Field(() => Float) pendente!: number;
  @Field(() => Float) saldo!: number;
  @Field(() => Float, { nullable: true }) percentExecutado?: number | null;
}

@ObjectType()
export class RelatorioPrevistoVsRealizado {
  @Field(() => Float) totalPrevisto!: number;
  @Field(() => Float) totalRealizado!: number;
  @Field(() => Float) totalPendente!: number;
  @Field(() => Float) saldo!: number;
  @Field(() => Float, { nullable: true }) percentExecutado?: number | null;
  @Field(() => [LinhaPrevistoVsRealizado]) porObra!: LinhaPrevistoVsRealizado[];
  @Field(() => [LinhaPrevistoVsRealizado]) porEtapa!: LinhaPrevistoVsRealizado[];
  @Field(() => [LinhaPrevistoVsRealizado]) porCategoria!: LinhaPrevistoVsRealizado[];
}

@ObjectType()
export class LinhaDesvio {
  @Field(() => String, { nullable: true }) chaveId?: string | null;
  @Field() chaveNome!: string;
  @Field(() => Float) previsto!: number;
  @Field(() => Float) realizado!: number;
  @Field(() => Float) desvioAbs!: number;
  @Field(() => Float, { nullable: true }) desvioPct?: number | null;
}

@ObjectType()
export class RelatorioDesvio {
  @Field(() => [LinhaDesvio]) porObra!: LinhaDesvio[];
  @Field(() => [LinhaDesvio]) porEtapa!: LinhaDesvio[];
  @Field(() => [LinhaDesvio]) porCategoria!: LinhaDesvio[];
  @Field(() => Int) totalDesvios!: number;
}

@ObjectType()
export class PontoFluxoCaixa {
  @Field() periodo!: string;
  @Field(() => Float) entradasConfirmadas!: number;
  @Field(() => Float) saidasConfirmadas!: number;
  @Field(() => Float) entradasPrevistas!: number;
  @Field(() => Float) saidasPrevistas!: number;
  @Field(() => Float) saldoConfirmado!: number;
  @Field(() => Float) saldoProjetado!: number;
}

@ObjectType()
export class RelatorioFluxoCaixa {
  @Field(() => [PontoFluxoCaixa]) pontos!: PontoFluxoCaixa[];
  @Field(() => Float) totalEntradasConfirmadas!: number;
  @Field(() => Float) totalSaidasConfirmadas!: number;
  @Field(() => Float) totalEntradasPrevistas!: number;
  @Field(() => Float) totalSaidasPrevistas!: number;
  @Field(() => Float) saldoFinalConfirmado!: number;
  @Field(() => Float) saldoFinalProjetado!: number;
}

@ObjectType()
export class LinhaQuebraCustos {
  @Field(() => ID) id!: string;
  @Field() nome!: string;
  @Field(() => Float) valor!: number;
  @Field(() => Float) percentTotal!: number;
}

@ObjectType()
export class RelatorioQuebraCustos {
  @Field(() => Float) total!: number;
  @Field(() => [LinhaQuebraCustos]) porCategoria!: LinhaQuebraCustos[];
  @Field(() => [LinhaQuebraCustos]) porTipoCategoria!: LinhaQuebraCustos[];
  @Field(() => [LinhaQuebraCustos]) porCentroCusto!: LinhaQuebraCustos[];
  @Field(() => [LinhaQuebraCustos]) porFornecedor!: LinhaQuebraCustos[];
}
