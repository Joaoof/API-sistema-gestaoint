import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { FiscalEnvironment, TaxRegime } from '@prisma/client';

registerEnumType(TaxRegime, { name: 'TaxRegime' });

@ObjectType()
export class CompanyFiscalConfigEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => FiscalEnvironment) ambiente!: FiscalEnvironment;
  @Field(() => TaxRegime) regimeTributario!: TaxRegime;
  @Field() cnpj!: string;
  @Field(() => String, { nullable: true }) inscricaoEstadual?: string | null;
  @Field(() => String, { nullable: true }) inscricaoMunicipal?: string | null;
  @Field(() => String, { nullable: true }) razaoSocial?: string | null;
  @Field(() => String, { nullable: true }) nomeFantasia?: string | null;
  @Field(() => String, { nullable: true }) endereco?: string | null;
  @Field(() => String, { nullable: true }) numero?: string | null;
  @Field(() => String, { nullable: true }) complemento?: string | null;
  @Field(() => String, { nullable: true }) bairro?: string | null;
  @Field(() => String, { nullable: true }) cidade?: string | null;
  @Field(() => String, { nullable: true }) codigoMunicipioIbge?: string | null;
  @Field(() => String, { nullable: true }) uf?: string | null;
  @Field(() => String, { nullable: true }) cep?: string | null;
  @Field(() => Int) serieNfe!: number;
  @Field(() => Int) proximoNumeroNfe!: number;
  @Field(() => Int) serieNfce!: number;
  @Field(() => Int) proximoNumeroNfce!: number;
  @Field(() => Int) serieNfse!: number;
  @Field(() => Int) proximoNumeroNfse!: number;
  @Field(() => Boolean) hasCertificado!: boolean;
  @Field(() => Date, { nullable: true }) certificadoValidoAte?: Date | null;
  @Field(() => String, { nullable: true }) cscIdNfce?: string | null;
  @Field(() => String, { nullable: true }) providerName?: string | null;
  @Field(() => Boolean) hasProviderToken!: boolean;
  @Field(() => String, { nullable: true }) providerCnpjReference?: string | null;
  @Field(() => Boolean) ativo!: boolean;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}
