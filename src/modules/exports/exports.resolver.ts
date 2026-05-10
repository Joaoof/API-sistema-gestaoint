import { UseGuards } from '@nestjs/common';
import { Args, Field, ID, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import {
  CreateExportTemplateInput,
  UpdateExportTemplateInput,
} from './dto/exports.input';
import { ExportsService } from './use-cases/exports.service';

@ObjectType()
export class ExportTemplateEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() module!: string;
  @Field() format!: string;
  @Field() filtersJson!: string;
  @Field(() => [String]) columns!: string[];
  @Field({ nullable: true }) schedule?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}

@ObjectType()
export class ExportRunResult {
  @Field() filename!: string;
  @Field() mimeType!: string;
  @Field() content!: string;
}

function toEntity(r: any): ExportTemplateEntity {
  return {
    id: r.id,
    name: r.name,
    module: r.module,
    format: r.format,
    filtersJson: JSON.stringify(r.filters ?? {}),
    columns: (r.columns as string[]) ?? [],
    schedule: r.schedule ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

@Resolver()
@UseGuards(GqlAuthGuard)
export class ExportsResolver {
  constructor(
    private readonly service: ExportsService,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [ExportTemplateEntity])
  async exportTemplates(@CurrentUser() user: User): Promise<ExportTemplateEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.service.list(companyId);
    return rows.map(toEntity);
  }

  @Mutation(() => ExportTemplateEntity)
  async createExportTemplate(
    @CurrentUser() user: User,
    @Args('input') input: CreateExportTemplateInput,
  ): Promise<ExportTemplateEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const created = await this.service.create(companyId, user.id, {
      name: input.name,
      module: input.module,
      format: input.format as any,
      filters: safeParse(input.filtersJson),
      columns: input.columns,
      schedule: input.schedule,
    });
    return toEntity(created);
  }

  @Mutation(() => ExportTemplateEntity)
  async updateExportTemplate(
    @CurrentUser() user: User,
    @Args('input') input: UpdateExportTemplateInput,
  ): Promise<ExportTemplateEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const r = await this.service.update(input.id, companyId, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.module !== undefined && { module: input.module }),
      ...(input.format !== undefined && { format: input.format as any }),
      ...(input.filtersJson !== undefined && { filters: safeParse(input.filtersJson) }),
      ...(input.columns !== undefined && { columns: input.columns }),
      ...(input.schedule !== undefined && { schedule: input.schedule }),
    } as any);
    return toEntity(r);
  }

  @Mutation(() => Boolean)
  async deleteExportTemplate(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.remove(id, companyId);
  }

  @Mutation(() => ExportRunResult)
  async runExportTemplate(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<ExportRunResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.run(id, companyId);
  }
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
