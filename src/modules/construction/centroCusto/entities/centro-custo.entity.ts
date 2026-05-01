import { Field, ID, ObjectType } from '@nestjs/graphql';
import { CategoriaConstrucaoTipo } from '@prisma/client';
import '../../shared/enums.gql';

@ObjectType()
export class CentroCustoEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field() codigo!: string;
  @Field() nome!: string;
  @Field(() => String, { nullable: true }) descricao?: string | null;
  @Field() ativo!: boolean;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}

@ObjectType()
export class CategoriaConstrucaoEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => String, { nullable: true }) parentId?: string | null;
  @Field() codigo!: string;
  @Field() nome!: string;
  @Field(() => CategoriaConstrucaoTipo) tipo!: CategoriaConstrucaoTipo;
  @Field() ativo!: boolean;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
