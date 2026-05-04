import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import {
  CancelInvoiceInput,
  IssueInvoiceInput,
  ListInvoicesInput,
} from './dto/issue-invoice.input';
import { InvoiceUseCases } from './use-cases/invoice.use-cases';

function requireCompany(user: User): string {
  if (!user.company_id) {
    throw new ForbiddenException(
      'Usuário sem empresa vinculada — não é possível operar notas fiscais.',
    );
  }
  return user.company_id;
}

@Resolver(() => InvoiceEntity)
@UseGuards(GqlAuthGuard)
export class InvoiceResolver {
  constructor(private readonly useCases: InvoiceUseCases) {}

  @Query(() => [InvoiceEntity])
  async invoices(
    @CurrentUser() user: User,
    @Args('input', { nullable: true, defaultValue: { take: 50, skip: 0 } })
    input?: ListInvoicesInput,
  ): Promise<InvoiceEntity[]> {
    const companyId = requireCompany(user);
    return this.useCases.list(companyId, input ?? ({ take: 50, skip: 0 } as ListInvoicesInput));
  }

  @Query(() => InvoiceEntity)
  async invoice(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<InvoiceEntity> {
    const companyId = requireCompany(user);
    return this.useCases.findById(companyId, id);
  }

  @Mutation(() => InvoiceEntity)
  async issueInvoice(
    @CurrentUser() user: User,
    @Args('input') input: IssueInvoiceInput,
  ): Promise<InvoiceEntity> {
    const companyId = requireCompany(user);
    return this.useCases.issue(companyId, user.id, input);
  }

  @Mutation(() => InvoiceEntity)
  async cancelInvoice(
    @CurrentUser() user: User,
    @Args('input') input: CancelInvoiceInput,
  ): Promise<InvoiceEntity> {
    const companyId = requireCompany(user);
    return this.useCases.cancel(companyId, input.invoiceId, input.motivo);
  }

  @Mutation(() => InvoiceEntity)
  async resyncInvoice(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<InvoiceEntity> {
    const companyId = requireCompany(user);
    return this.useCases.resync(companyId, id);
  }
}
