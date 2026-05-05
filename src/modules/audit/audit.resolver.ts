import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser, getUserId } from '../construction/shared/auth-user';
import { AuditLogFilterInput } from './dto/audit-log-filter.input';
import {
  AuditLogEntity,
  AuditLogPageEntity,
} from './entities/audit-log.entity';
import { AuditUseCases } from './use-cases/audit.use-cases';
import { AuditAccessService } from './use-cases/audit-access.service';
import { AuditAccessGuard } from './guards/audit-access.guard';

@ObjectType()
class AuditAccessTokenEntity {
  @Field() token!: string;
  @Field(() => Int) expiresIn!: number;
}

@Resolver(() => AuditLogEntity)
export class AuditResolver {
  constructor(
    private readonly useCases: AuditUseCases,
    private readonly tenancy: TenancyService,
    private readonly access: AuditAccessService,
  ) {}

  @Mutation(() => AuditAccessTokenEntity)
  @UseGuards(GqlAuthGuard)
  async verifyAuditAccess(
    @CurrentUser() user: AuthUser,
    @Args('password') password: string,
  ): Promise<AuditAccessTokenEntity> {
    const userId = getUserId(user);
    if (!userId) throw new Error('Usuário não autenticado.');
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.access.issueToken(userId, companyId, password);
  }

  @Query(() => AuditLogPageEntity)
  @UseGuards(GqlAuthGuard, AuditAccessGuard)
  async auditLogs(
    @CurrentUser() user: AuthUser,
    @Args('filter', { nullable: true }) filter?: AuditLogFilterInput,
  ): Promise<AuditLogPageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, filter ?? {});
  }

  @Query(() => AuditLogEntity, { nullable: true })
  @UseGuards(GqlAuthGuard, AuditAccessGuard)
  async auditLog(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<AuditLogEntity | null> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Query(() => [AuditLogEntity])
  @UseGuards(GqlAuthGuard, AuditAccessGuard)
  async auditLogsForEntity(
    @CurrentUser() user: AuthUser,
    @Args('entity') entity: string,
    @Args('entityId') entityId: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<AuditLogEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.listForEntity(companyId, entity, entityId, limit);
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard, AuditAccessGuard)
  async auditLogsExportCsv(
    @CurrentUser() user: AuthUser,
    @Args('filter', { nullable: true }) filter?: AuditLogFilterInput,
  ): Promise<string> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.exportCsv(companyId, filter ?? {});
  }
}
