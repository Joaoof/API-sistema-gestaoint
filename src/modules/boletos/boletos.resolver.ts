import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  Float,
  ID,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { BoletosService } from './use-cases/boletos.service';

@InputType()
class IssueBoletoInput {
  @Field() @IsString() bankId!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() accountReceivableId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() customerId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() provider?: string;
  @Field(() => Float) @IsNumber() @IsPositive() amount!: number;
  @Field() @IsDateString() dueDate!: string;
  @Field() @IsString() @MaxLength(160) payerName!: string;
  @Field() @IsString() @MaxLength(20) payerDocument!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) instructions?: string;
}

@ObjectType()
class BoletoEntity {
  @Field(() => ID) id!: string;
  @Field() companyId!: string;
  @Field(() => String, { nullable: true }) accountReceivableId?: string | null;
  @Field() bankId!: string;
  @Field() provider!: string;
  @Field(() => String, { nullable: true }) providerBoletoId?: string | null;
  @Field(() => String, { nullable: true }) nossoNumero?: string | null;
  @Field(() => String, { nullable: true }) barcode?: string | null;
  @Field(() => String, { nullable: true }) digitableLine?: string | null;
  @Field(() => String, { nullable: true }) pdfUrl?: string | null;
  @Field(() => Float) amount!: number;
  @Field() dueDate!: Date;
  @Field() status!: string;
  @Field(() => String, { nullable: true }) errorMessage?: string | null;
  @Field() payerName!: string;
  @Field() payerDocument!: string;
  @Field(() => Date, { nullable: true }) registeredAt?: Date | null;
  @Field(() => Date, { nullable: true }) paidAt?: Date | null;
  @Field() createdAt!: Date;
}

function toEntity(b: any): BoletoEntity {
  return {
    id: b.id,
    companyId: b.companyId,
    accountReceivableId: b.accountReceivableId,
    bankId: b.bankId,
    provider: b.provider,
    providerBoletoId: b.providerBoletoId,
    nossoNumero: b.nossoNumero,
    barcode: b.barcode,
    digitableLine: b.digitableLine,
    pdfUrl: b.pdfUrl,
    amount: Number(b.amount),
    dueDate: b.dueDate,
    status: b.status,
    errorMessage: b.errorMessage,
    payerName: b.payerName,
    payerDocument: b.payerDocument,
    registeredAt: b.registeredAt,
    paidAt: b.paidAt,
    createdAt: b.createdAt,
  };
}

@Resolver()
@UseGuards(GqlAuthGuard)
export class BoletosResolver {
  constructor(
    private readonly service: BoletosService,
    private readonly tenancy: TenancyService,
  ) {}

  @Mutation(() => BoletoEntity)
  async issueBoleto(
    @CurrentUser() user: User,
    @Args('input') input: IssueBoletoInput,
  ): Promise<BoletoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const b = await this.service.issue(
      { userId: user.id, companyId },
      {
        accountReceivableId: input.accountReceivableId,
        customerId: input.customerId,
        bankId: input.bankId,
        provider: input.provider,
        amount: input.amount,
        dueDate: new Date(input.dueDate),
        payerName: input.payerName,
        payerDocument: input.payerDocument,
        instructions: input.instructions,
      },
    );
    return toEntity(b);
  }

  @Mutation(() => BoletoEntity)
  async cancelBoleto(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<BoletoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const b = await this.service.cancel({ userId: user.id, companyId }, id);
    return toEntity(b);
  }

  @Mutation(() => BoletoEntity)
  async markBoletoPaid(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('paidAt', { nullable: true }) paidAt?: string,
  ): Promise<BoletoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const b = await this.service.markPaid({ userId: user.id, companyId }, id, {
      paidAt: paidAt ? new Date(paidAt) : undefined,
    });
    return toEntity(b);
  }

  @Query(() => [BoletoEntity])
  async boletos(
    @CurrentUser() user: User,
    @Args('status', { nullable: true }) status?: string,
  ): Promise<BoletoEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.service.list(companyId, { status });
    return rows.map(toEntity);
  }

  @Query(() => BoletoEntity)
  async boleto(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<BoletoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const b = await this.service.findById(companyId, id);
    return toEntity(b);
  }
}
