import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { RecordPaymentInput } from './dto/payments.input';
import {
  PaymentReceiptEntity,
  RecordPaymentResult,
} from './entities/payments.entities';
import { PaymentsService } from './use-cases/payments.service';

function toReceiptEntity(r: any): PaymentReceiptEntity {
  return {
    id: r.id,
    accountReceivableId: r.accountReceivableId,
    accountPayableId: r.accountPayableId,
    amount: Number(r.amount),
    paymentMethod: r.paymentMethod,
    bankId: r.bankId,
    paidAt: r.paidAt,
    notes: r.notes,
    cashMovementId: r.cashMovementId,
    createdByUserId: r.createdByUserId,
    createdAt: r.createdAt,
  };
}

@Resolver()
@UseGuards(GqlAuthGuard)
export class PaymentsResolver {
  constructor(
    private readonly service: PaymentsService,
    private readonly tenancy: TenancyService,
  ) {}

  @Mutation(() => RecordPaymentResult)
  async recordReceivablePayment(
    @CurrentUser() user: User,
    @Args('input') input: RecordPaymentInput,
  ): Promise<RecordPaymentResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const out = await this.service.recordReceivablePayment(
      { userId: user.id, companyId },
      input.accountId,
      {
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        bankId: input.bankId,
        paidAt: input.paidAt ? new Date(input.paidAt) : null,
        notes: input.notes,
      },
    );
    return {
      receipt: toReceiptEntity(out.receipt),
      accountId: out.accountReceivable.id,
      newPaidAmount: Number(out.accountReceivable.paidAmount),
      status: out.accountReceivable.status,
      fullyPaid: out.accountReceivable.status === 'PAID',
    };
  }

  @Mutation(() => RecordPaymentResult)
  async recordPayablePayment(
    @CurrentUser() user: User,
    @Args('input') input: RecordPaymentInput,
  ): Promise<RecordPaymentResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const out = await this.service.recordPayablePayment(
      { userId: user.id, companyId },
      input.accountId,
      {
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        bankId: input.bankId,
        paidAt: input.paidAt ? new Date(input.paidAt) : null,
        notes: input.notes,
      },
    );
    return {
      receipt: toReceiptEntity(out.receipt),
      accountId: out.accountPayable.id,
      newPaidAmount: Number(out.accountPayable.paidAmount),
      status: out.accountPayable.status,
      fullyPaid: out.accountPayable.status === 'PAID',
    };
  }

  @Query(() => [PaymentReceiptEntity])
  async receivablePayments(
    @CurrentUser() user: User,
    @Args('accountReceivableId') accountReceivableId: string,
  ): Promise<PaymentReceiptEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.service.listReceivableReceipts(companyId, accountReceivableId);
    return rows.map(toReceiptEntity);
  }

  @Query(() => [PaymentReceiptEntity])
  async payablePayments(
    @CurrentUser() user: User,
    @Args('accountPayableId') accountPayableId: string,
  ): Promise<PaymentReceiptEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.service.listPayableReceipts(companyId, accountPayableId);
    return rows.map(toReceiptEntity);
  }
}
