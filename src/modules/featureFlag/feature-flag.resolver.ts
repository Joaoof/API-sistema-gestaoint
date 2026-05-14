import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { SuperAdminGuard } from '../../auth/guards/super-admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import {
  ApplyBusinessTemplateInput,
  BusinessTemplateDtoGql,
  CompanyModuleOverrideDto,
  FeatureDto,
  PublicConfigFieldDto,
  SetCompanyModuleConfigInput,
  ToggleCompanyModuleInput,
} from './dto/feature-flag.dto';
import { BusinessTemplateService } from './use-cases/business-template.service';
import { CompanyModuleToggleService } from './use-cases/company-module-toggle.service';
import { FeatureFlagService } from './use-cases/feature-flag.service';
import { ModuleConfigService } from './use-cases/module-config.service';

/**
 * Queries/Mutations consumidas pelo CLIENTE LOGADO (gestaoint).
 * O guard de auth aqui é só GqlAuthGuard — qualquer usuário autenticado
 * pode listar suas próprias features.
 */
@Resolver()
@UseGuards(GqlAuthGuard)
export class MyFeaturesResolver {
  constructor(private readonly featureFlag: FeatureFlagService) {}

  @Query(() => [FeatureDto], { name: 'myFeatures' })
  async myFeatures(@CurrentUser() user: User): Promise<FeatureDto[]> {
    if (!user.company_id) return [];
    const list = await this.featureFlag.getEffectiveModules(user.company_id);
    return list.map((f) => ({
      module_key: f.module_key,
      name: f.name,
      enabled: f.enabled,
      source: f.source,
      permission: f.permission,
      hasConfig: f.hasConfig,
    }));
  }
}

/**
 * Mutations/queries de SuperAdmin: gerenciar feature flags por empresa,
 * config criptografada, e aplicar templates de negócio.
 */
@Resolver()
@UseGuards(GqlAuthGuard, SuperAdminGuard)
export class FeatureFlagAdminResolver {
  constructor(
    private readonly featureFlag: FeatureFlagService,
    private readonly toggle: CompanyModuleToggleService,
    private readonly config: ModuleConfigService,
    private readonly templates: BusinessTemplateService,
  ) {}

  // ------------------------- listagens

  @Query(() => [FeatureDto], { name: 'superAdminCompanyFeatures' })
  async companyFeatures(
    @Args('companyId') companyId: string,
  ): Promise<FeatureDto[]> {
    const list = await this.featureFlag.getEffectiveModules(companyId);
    return list.map((f) => ({
      module_key: f.module_key,
      name: f.name,
      enabled: f.enabled,
      source: f.source,
      permission: f.permission,
      hasConfig: f.hasConfig,
    }));
  }

  @Query(() => [CompanyModuleOverrideDto], { name: 'superAdminCompanyOverrides' })
  async companyOverrides(
    @Args('companyId') companyId: string,
  ): Promise<CompanyModuleOverrideDto[]> {
    const rows = await this.toggle.listForCompany(companyId);
    return rows.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      module_key: r.module_key,
      enabled: r.enabled,
      hasConfig: r.config !== null && r.config !== undefined,
      updatedAt: r.updatedAt,
    }));
  }

  @Query(() => [PublicConfigFieldDto], {
    name: 'superAdminCompanyModuleConfig',
  })
  async moduleConfig(
    @Args('companyId') companyId: string,
    @Args('module_key') module_key: string,
  ): Promise<PublicConfigFieldDto[]> {
    const list = await this.config.getPublicConfig(companyId, module_key);
    return list.map((f) => {
      if (f.type === 'plain') {
        return {
          key: f.key,
          type: 'plain',
          valueJson: f.value === undefined ? null : JSON.stringify(f.value),
          hasValue: null as unknown as undefined,
          hint: null,
        };
      }
      return {
        key: f.key,
        type: 'secret',
        valueJson: null,
        hasValue: f.hasValue,
        hint: f.hint,
      };
    });
  }

  @Query(() => [BusinessTemplateDtoGql], { name: 'superAdminBusinessTemplates' })
  async listTemplates(): Promise<BusinessTemplateDtoGql[]> {
    return this.templates.list();
  }

  // ------------------------- mutations

  @Mutation(() => Boolean, { name: 'superAdminToggleCompanyModule' })
  async toggleModule(
    @Args('input') input: ToggleCompanyModuleInput,
  ): Promise<boolean> {
    await this.toggle.toggle(input.companyId, input.module_key, input.enabled);
    return true;
  }

  @Mutation(() => Boolean, { name: 'superAdminSetCompanyModuleConfig' })
  async setConfig(
    @Args('input') input: SetCompanyModuleConfigInput,
  ): Promise<boolean> {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(input.configJson);
    } catch {
      throw new BadRequestException('configJson não é JSON válido');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('configJson deve ser objeto JSON');
    }
    await this.config.setConfig(input.companyId, input.module_key, parsed);
    return true;
  }

  @Mutation(() => Boolean, { name: 'superAdminApplyBusinessTemplate' })
  async applyTemplate(
    @Args('input') input: ApplyBusinessTemplateInput,
  ): Promise<boolean> {
    await this.templates.applyToCompany(
      input.companyId,
      input.template_key,
      { replaceExisting: input.replaceExisting },
    );
    return true;
  }
}
