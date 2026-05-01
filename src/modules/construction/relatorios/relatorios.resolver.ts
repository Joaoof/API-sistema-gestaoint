import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../../../auth/guards/auth.guard';
import { AuthUser } from '../shared/auth-user';
import { TenancyService } from '../shared/tenancy.service';
import {
  RelatorioFiltroInput,
  RelatorioFluxoCaixaInput,
} from './dto/relatorios.input';
import {
  RelatorioDesvio,
  RelatorioFluxoCaixa,
  RelatorioPrevistoVsRealizado,
  RelatorioQuebraCustos,
} from './dto/relatorios.types';
import { RelatoriosUseCases } from './use-cases/relatorios.use-cases';

@Resolver()
@UseGuards(GqlAuthGuard)
export class RelatoriosResolver {
  constructor(
    private readonly useCases: RelatoriosUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => RelatorioPrevistoVsRealizado)
  async relatorioPrevistoVsRealizado(
    @CurrentUser() user: AuthUser,
    @Args('filter') filter: RelatorioFiltroInput,
  ): Promise<RelatorioPrevistoVsRealizado> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.previstoVsRealizado(companyId, filter);
  }

  @Query(() => RelatorioDesvio)
  async relatorioDesvio(
    @CurrentUser() user: AuthUser,
    @Args('filter') filter: RelatorioFiltroInput,
  ): Promise<RelatorioDesvio> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.desvio(companyId, filter);
  }

  @Query(() => RelatorioFluxoCaixa)
  async relatorioFluxoCaixa(
    @CurrentUser() user: AuthUser,
    @Args('input') input: RelatorioFluxoCaixaInput,
  ): Promise<RelatorioFluxoCaixa> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.fluxoCaixa(companyId, input);
  }

  @Query(() => RelatorioQuebraCustos)
  async relatorioQuebraCustos(
    @CurrentUser() user: AuthUser,
    @Args('filter') filter: RelatorioFiltroInput,
  ): Promise<RelatorioQuebraCustos> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.quebraCustos(companyId, filter);
  }
}
