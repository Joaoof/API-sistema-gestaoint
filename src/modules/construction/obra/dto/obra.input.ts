import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { ObraStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import '../../shared/enums.gql';

@InputType()
export class CreateObraInput {
  @Field()
  @IsString()
  @MaxLength(40)
  codigo!: string;

  @Field()
  @IsString()
  @MaxLength(160)
  nome!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  customerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @Field({ nullable: true }) @IsOptional() @IsString() endereco?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() cidade?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() estado?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() cep?: string;

  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() latitude?: number;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() longitude?: number;

  @Field(() => ObraStatus, { defaultValue: ObraStatus.PLANEJAMENTO })
  @IsEnum(ObraStatus)
  status!: ObraStatus;

  @Field(() => Date, { nullable: true }) @IsOptional() dataInicio?: Date;
  @Field(() => Date, { nullable: true }) @IsOptional() dataFimPrev?: Date;
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorContrato?: number;
}

@InputType()
export class UpdateObraInput {
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(160) nome?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() customerId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(2000) descricao?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() endereco?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() cidade?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() estado?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() cep?: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() latitude?: number;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() longitude?: number;
  @Field(() => ObraStatus, { nullable: true }) @IsOptional() @IsEnum(ObraStatus) status?: ObraStatus;
  @Field(() => Date, { nullable: true }) @IsOptional() dataInicio?: Date;
  @Field(() => Date, { nullable: true }) @IsOptional() dataFimPrev?: Date;
  @Field(() => Date, { nullable: true }) @IsOptional() dataFimReal?: Date;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) valorContrato?: number;
}

@InputType()
export class CreateEtapaInput {
  @Field() @IsString() obraId!: string;
  @Field() @IsString() @MaxLength(40) codigo!: string;
  @Field() @IsString() @MaxLength(200) nome!: string;
  @Field(() => Int, { defaultValue: 0 }) @IsInt() @Min(0) ordem!: number;
  @Field({ nullable: true }) @IsOptional() @IsString() descricao?: string;
}

@InputType()
export class CreateSubetapaInput {
  @Field() @IsString() etapaId!: string;
  @Field() @IsString() @MaxLength(40) codigo!: string;
  @Field() @IsString() @MaxLength(200) nome!: string;
  @Field(() => Int, { defaultValue: 0 }) @IsInt() @Min(0) ordem!: number;
  @Field({ nullable: true }) @IsOptional() @IsString() descricao?: string;
}

@InputType()
export class CreateItemWbsInput {
  @Field() @IsString() etapaId!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() subetapaId?: string;
  @Field() @IsString() @MaxLength(40) codigo!: string;
  @Field() @IsString() @MaxLength(200) nome!: string;
  @Field({ defaultValue: 'UN' }) @IsString() unidade!: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() quantidadeRef?: number;
  @Field(() => Int, { defaultValue: 0 }) @IsInt() @Min(0) ordem!: number;
  @Field({ nullable: true }) @IsOptional() @IsString() descricao?: string;
}
