import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../../../auth/guards/auth.guard';
import { AuthUser, getUserId } from '../shared/auth-user';
import { TenancyService } from '../shared/tenancy.service';
import {
  AddItensOrcamentoInput,
  CompararVersoesInput,
  CreateVersaoOrcamentoInput,
} from './dto/orcamento.input';
import {
  ComparacaoVersoesEntity,
  VersaoOrcamentoEntity,
} from './entities/orcamento.entity';
import { OrcamentoUseCases } from './use-cases/orcamento.use-cases';

@Resolver(() => VersaoOrcamentoEntity)
@UseGuards(GqlAuthGuard)
export class OrcamentoResolver {
  constructor(
    private readonly useCases: OrcamentoUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [VersaoOrcamentoEntity])
  async versoesOrcamento(
    @CurrentUser() user: AuthUser,
    @Args('obraId') obraId: string,
  ): Promise<VersaoOrcamentoEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.listVersoes(companyId, obraId);
  }

  @Query(() => VersaoOrcamentoEntity)
  async versaoOrcamento(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<VersaoOrcamentoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findVersao(companyId, id);
  }

  @Mutation(() => VersaoOrcamentoEntity)
  async createVersaoOrcamento(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateVersaoOrcamentoInput,
  ): Promise<VersaoOrcamentoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.createVersao(companyId, getUserId(user), input);
  }

  @Mutation(() => VersaoOrcamentoEntity)
  async addItensOrcamento(
    @CurrentUser() user: AuthUser,
    @Args('input') input: AddItensOrcamentoInput,
  ): Promise<VersaoOrcamentoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.addItens(companyId, getUserId(user), input);
  }

  @Mutation(() => VersaoOrcamentoEntity)
  async ativarVersaoOrcamento(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<VersaoOrcamentoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.ativarVersao(companyId, getUserId(user), id);
  }

  @Query(() => ComparacaoVersoesEntity)
  async compararVersoesOrcamento(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CompararVersoesInput,
  ): Promise<ComparacaoVersoesEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.compararVersoes(companyId, input);
  }
}
