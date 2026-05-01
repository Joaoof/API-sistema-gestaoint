import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ObraStatus } from '@prisma/client';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../../../auth/guards/auth.guard';
import { AuthUser, getUserId } from '../shared/auth-user';
import { TenancyService } from '../shared/tenancy.service';
import {
  CreateEtapaInput,
  CreateItemWbsInput,
  CreateObraInput,
  CreateSubetapaInput,
  UpdateObraInput,
} from './dto/obra.input';
import {
  ObraEntity,
  ObraEtapaEntity,
  ObraItemWBSEntity,
  ObraSubetapaEntity,
} from './entities/obra.entity';
import { ObraUseCases } from './use-cases/obra.use-cases';

@Resolver(() => ObraEntity)
@UseGuards(GqlAuthGuard)
export class ObraResolver {
  constructor(
    private readonly useCases: ObraUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [ObraEntity])
  async obras(
    @CurrentUser() user: AuthUser,
    @Args('search', { nullable: true }) search?: string,
    @Args('status', { type: () => ObraStatus, nullable: true }) status?: ObraStatus,
    @Args('customerId', { nullable: true }) customerId?: string,
  ): Promise<ObraEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list({ companyId, search, status, customerId });
  }

  @Query(() => ObraEntity)
  async obra(@CurrentUser() user: AuthUser, @Args('id') id: string): Promise<ObraEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Mutation(() => ObraEntity)
  async createObra(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateObraInput,
  ): Promise<ObraEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create(companyId, getUserId(user), input);
  }

  @Mutation(() => ObraEntity)
  async updateObra(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateObraInput,
  ): Promise<ObraEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update(companyId, getUserId(user), id, input);
  }

  @Mutation(() => Boolean)
  async deleteObra(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('reason', { nullable: true }) reason?: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.softDelete(companyId, getUserId(user), id, reason);
  }

  @Mutation(() => ObraEtapaEntity)
  async createObraEtapa(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateEtapaInput,
  ): Promise<ObraEtapaEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.createEtapa(companyId, getUserId(user), input);
  }

  @Mutation(() => ObraSubetapaEntity)
  async createObraSubetapa(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateSubetapaInput,
  ): Promise<ObraSubetapaEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.createSubetapa(companyId, getUserId(user), input);
  }

  @Mutation(() => ObraItemWBSEntity)
  async createObraItemWbs(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateItemWbsInput,
  ): Promise<ObraItemWBSEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.createItemWbs(companyId, getUserId(user), input);
  }
}
