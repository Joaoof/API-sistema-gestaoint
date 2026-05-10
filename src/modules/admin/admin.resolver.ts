import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { SuperAdminGuard } from '../../auth/guards/super-admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import {
  AdminAssignPlanInput,
  AdminCreateModuleInput,
  AdminCreatePlanInput,
  AdminCreateUserInput,
  AdminResetPasswordInput,
  AdminUpdatePlanInput,
  AdminUpdateUserInput,
  AdminUpsertPlanModuleInput,
} from './dto/admin.input';
import {
  AdminCompanyEntity,
  AdminModuleEntity,
  AdminPlanEntity,
  AdminUserEntity,
} from './entities/admin.entities';
import { AdminPermissionsService } from './use-cases/admin-permissions.service';
import { AdminUsersService } from './use-cases/admin-users.service';

@Resolver()
@UseGuards(GqlAuthGuard, SuperAdminGuard)
export class AdminResolver {
  constructor(
    private readonly users: AdminUsersService,
    private readonly perms: AdminPermissionsService,
    private readonly tenancy: TenancyService,
  ) {}

  // ============ Users ============

  @Query(() => [AdminUserEntity])
  adminUsers(@Args('search', { nullable: true }) search?: string) {
    return this.users.list(search);
  }

  @Mutation(() => AdminUserEntity)
  async adminCreateUser(
    @CurrentUser() user: User,
    @Args('input') input: AdminCreateUserInput,
  ) {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.users.create({ userId: user.id, companyId }, input);
  }

  @Mutation(() => AdminUserEntity)
  async adminUpdateUser(
    @CurrentUser() user: User,
    @Args('input') input: AdminUpdateUserInput,
  ) {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.users.update({ userId: user.id, companyId }, input);
  }

  @Mutation(() => Boolean)
  async adminResetUserPassword(
    @CurrentUser() user: User,
    @Args('input') input: AdminResetPasswordInput,
  ) {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.users.resetPassword({ userId: user.id, companyId }, input);
  }

  @Mutation(() => Boolean)
  async adminDeactivateUser(@CurrentUser() user: User, @Args('id') id: string) {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.users.remove({ userId: user.id, companyId }, id);
  }

  // ============ Plans ============

  @Query(() => [AdminPlanEntity])
  adminPlans() {
    return this.perms.listPlans();
  }

  @Mutation(() => AdminPlanEntity)
  async adminCreatePlan(
    @CurrentUser() user: User,
    @Args('input') input: AdminCreatePlanInput,
  ) {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.perms.createPlan({ userId: user.id, companyId }, input);
  }

  @Mutation(() => AdminPlanEntity)
  async adminUpdatePlan(
    @CurrentUser() user: User,
    @Args('input') input: AdminUpdatePlanInput,
  ) {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.perms.updatePlan({ userId: user.id, companyId }, input);
  }

  @Mutation(() => Boolean)
  async adminDeletePlan(@CurrentUser() user: User, @Args('id') id: string) {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.perms.deletePlan({ userId: user.id, companyId }, id);
  }

  // ============ Modules ============

  @Query(() => [AdminModuleEntity])
  adminModules() {
    return this.perms.listModules();
  }

  @Mutation(() => AdminModuleEntity)
  async adminCreateModule(
    @CurrentUser() user: User,
    @Args('input') input: AdminCreateModuleInput,
  ) {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.perms.createModule({ userId: user.id, companyId }, input);
  }

  // ============ PlanModules ============

  @Mutation(() => Boolean)
  async adminUpsertPlanModule(
    @CurrentUser() user: User,
    @Args('input') input: AdminUpsertPlanModuleInput,
  ) {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.perms.upsertPlanModule({ userId: user.id, companyId }, input);
  }

  @Mutation(() => Boolean)
  async adminRemovePlanModule(
    @CurrentUser() user: User,
    @Args('planId') planId: string,
    @Args('moduleId') moduleId: string,
  ) {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.perms.removePlanModule({ userId: user.id, companyId }, planId, moduleId);
  }

  // ============ Companies ============

  @Query(() => [AdminCompanyEntity])
  adminCompanies() {
    return this.perms.listCompanies();
  }

  @Mutation(() => Boolean)
  async adminAssignPlanToCompany(
    @CurrentUser() user: User,
    @Args('input') input: AdminAssignPlanInput,
  ) {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.perms.assignPlan({ userId: user.id, companyId }, input);
  }
}
