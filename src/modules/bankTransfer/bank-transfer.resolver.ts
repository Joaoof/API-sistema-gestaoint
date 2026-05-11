import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { BankTransferInput } from './dto/bank-transfer.input';
import { BankTransferService } from './use-cases/bank-transfer.service';

@Resolver()
@UseGuards(GqlAuthGuard)
export class BankTransferResolver {
  constructor(
    private readonly service: BankTransferService,
    private readonly tenancy: TenancyService,
  ) {}

  /**
   * Cria uma transferência atômica entre dois bancos: gera 1 movimento de
   * saída no banco de origem e 1 entrada no destino, ambos com o mesmo
   * `transferId` (UUID) para fácil reconciliação.
   */
  @Mutation(() => String, {
    description:
      'Retorna o transferId que liga os dois CashMovements criados.',
  })
  async transferBetweenBanks(
    @CurrentUser() user: User,
    @Args('input') input: BankTransferInput,
  ): Promise<string> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.transfer(input, user.id, companyId);
  }
}
