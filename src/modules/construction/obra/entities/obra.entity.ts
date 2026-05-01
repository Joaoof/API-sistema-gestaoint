import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { ObraStatus } from '@prisma/client';
import '../../shared/enums.gql';

@ObjectType()
export class ObraItemWBSEntity {
  @Field(() => ID) id!: string;
  @Field() etapaId!: string;
  @Field(() => String, { nullable: true }) subetapaId?: string | null;
  @Field() codigo!: string;
  @Field() nome!: string;
  @Field() unidade!: string;
  @Field(() => Float, { nullable: true }) quantidadeRef?: number | null;
  @Field(() => Int) ordem!: number;
  @Field(() => String, { nullable: true }) descricao?: string | null;
}

@ObjectType()
export class ObraSubetapaEntity {
  @Field(() => ID) id!: string;
  @Field() etapaId!: string;
  @Field() codigo!: string;
  @Field() nome!: string;
  @Field(() => Int) ordem!: number;
  @Field(() => String, { nullable: true }) descricao?: string | null;
  @Field(() => [ObraItemWBSEntity], { nullable: true }) itens?: ObraItemWBSEntity[];
}

@ObjectType()
export class ObraEtapaEntity {
  @Field(() => ID) id!: string;
  @Field() obraId!: string;
  @Field() codigo!: string;
  @Field() nome!: string;
  @Field(() => Int) ordem!: number;
  @Field(() => String, { nullable: true }) descricao?: string | null;
  @Field(() => [ObraSubetapaEntity], { nullable: true }) subetapas?: ObraSubetapaEntity[];
  @Field(() => [ObraItemWBSEntity], { nullable: true }) itens?: ObraItemWBSEntity[];
}

@ObjectType()
export class ObraEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => String, { nullable: true }) customerId?: string | null;
  @Field() codigo!: string;
  @Field() nome!: string;
  @Field(() => String, { nullable: true }) descricao?: string | null;
  @Field(() => String, { nullable: true }) endereco?: string | null;
  @Field(() => String, { nullable: true }) cidade?: string | null;
  @Field(() => String, { nullable: true }) estado?: string | null;
  @Field(() => String, { nullable: true }) cep?: string | null;
  @Field(() => Float, { nullable: true }) latitude?: number | null;
  @Field(() => Float, { nullable: true }) longitude?: number | null;
  @Field(() => ObraStatus) status!: ObraStatus;
  @Field(() => Date, { nullable: true }) dataInicio?: Date | null;
  @Field(() => Date, { nullable: true }) dataFimPrev?: Date | null;
  @Field(() => Date, { nullable: true }) dataFimReal?: Date | null;
  @Field(() => Float, { nullable: true }) valorContrato?: number | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
  @Field(() => [ObraEtapaEntity], { nullable: true }) etapas?: ObraEtapaEntity[];
}
