import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../../../auth/guards/auth.guard';
import { AuthUser, getUserId } from '../shared/auth-user';
import { TenancyService } from '../shared/tenancy.service';
import {
  ConfirmarTransacaoInput,
  CreateTransacaoInput,
  EstornarTransacaoInput,
  ListTransacoesFilterInput,
} from './dto/transacao.input';
import { TransacaoFinanceiraEntity } from './entities/transacao.entity';
import { TransacaoUseCases } from './use-cases/transacao.use-cases';

@Resolver(() => TransacaoFinanceiraEntity)
@UseGuards(GqlAuthGuard)
export class TransacaoResolver {
  constructor(
    private readonly useCases: TransacaoUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [TransacaoFinanceiraEntity])
  async transacoes(
    @CurrentUser() user: AuthUser,
    @Args('filter') filter: ListTransacoesFilterInput,
  ): Promise<TransacaoFinanceiraEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, filter);
  }

  @Query(() => TransacaoFinanceiraEntity)
  async transacao(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<TransacaoFinanceiraEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Mutation(() => TransacaoFinanceiraEntity)
  async createTransacao(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateTransacaoInput,
  ): Promise<TransacaoFinanceiraEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create(companyId, getUserId(user), input);
  }

  @Mutation(() => TransacaoFinanceiraEntity)
  async confirmarTransacao(
    @CurrentUser() user: AuthUser,
    @Args('input') input: ConfirmarTransacaoInput,
  ): Promise<TransacaoFinanceiraEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.confirmar(companyId, getUserId(user), input);
  }

  @Mutation(() => TransacaoFinanceiraEntity)
  async estornarTransacao(
    @CurrentUser() user: AuthUser,
    @Args('input') input: EstornarTransacaoInput,
  ): Promise<TransacaoFinanceiraEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.estornar(companyId, getUserId(user), input);
  }

  @Mutation(() => Boolean)
  async cancelarTransacaoPendente(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('motivo', { nullable: true }) motivo?: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.cancelarPendente(companyId, getUserId(user), id, motivo);
  }
}
