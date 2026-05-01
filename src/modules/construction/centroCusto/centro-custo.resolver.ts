import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../../../auth/guards/auth.guard';
import { AuthUser, getUserId } from '../shared/auth-user';
import { TenancyService } from '../shared/tenancy.service';
import {
  CreateCategoriaConstrucaoInput,
  CreateCentroCustoInput,
  UpdateCategoriaConstrucaoInput,
  UpdateCentroCustoInput,
} from './dto/centro-custo.input';
import {
  CategoriaConstrucaoEntity,
  CentroCustoEntity,
} from './entities/centro-custo.entity';
import { CentroCustoUseCases } from './use-cases/centro-custo.use-cases';

@Resolver()
@UseGuards(GqlAuthGuard)
export class CentroCustoResolver {
  constructor(
    private readonly useCases: CentroCustoUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [CentroCustoEntity])
  async centrosCusto(@CurrentUser() user: AuthUser): Promise<CentroCustoEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId);
  }

  @Query(() => CentroCustoEntity)
  async centroCusto(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<CentroCustoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Mutation(() => CentroCustoEntity)
  async createCentroCusto(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateCentroCustoInput,
  ): Promise<CentroCustoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create(companyId, getUserId(user), input);
  }

  @Mutation(() => CentroCustoEntity)
  async updateCentroCusto(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateCentroCustoInput,
  ): Promise<CentroCustoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update(companyId, getUserId(user), id, input);
  }

  @Mutation(() => Boolean)
  async deleteCentroCusto(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.softDelete(companyId, getUserId(user), id);
  }

  @Query(() => [CategoriaConstrucaoEntity])
  async categoriasConstrucao(
    @CurrentUser() user: AuthUser,
  ): Promise<CategoriaConstrucaoEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.listCategorias(companyId);
  }

  @Mutation(() => CategoriaConstrucaoEntity)
  async createCategoriaConstrucao(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateCategoriaConstrucaoInput,
  ): Promise<CategoriaConstrucaoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.createCategoria(companyId, getUserId(user), input);
  }

  @Mutation(() => CategoriaConstrucaoEntity)
  async updateCategoriaConstrucao(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateCategoriaConstrucaoInput,
  ): Promise<CategoriaConstrucaoEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.updateCategoria(companyId, getUserId(user), id, input);
  }
}
