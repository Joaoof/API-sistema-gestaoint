import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { FeatureFlagService } from './feature-flag.service';

export type BusinessTemplateDto = {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  modules: { module_key: string; enabled: boolean }[];
};

@Injectable()
export class BusinessTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlag: FeatureFlagService,
  ) {}

  async list(): Promise<BusinessTemplateDto[]> {
    const rows = await this.prisma.businessTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { modules: true },
    });
    return rows.map((r) => ({
      id: r.id,
      template_key: r.template_key,
      name: r.name,
      description: r.description,
      icon: r.icon,
      isActive: r.isActive,
      modules: r.modules.map((m) => ({
        module_key: m.module_key,
        enabled: m.enabled,
      })),
    }));
  }

  /**
   * Aplica um template a uma empresa: cria/atualiza CompanyModuleOverride
   * pra cada módulo do template. Não remove overrides já existentes
   * fora do template — passa `replaceExisting=true` para zerar antes.
   */
  async applyToCompany(
    companyId: string,
    template_key: string,
    opts: { replaceExisting?: boolean } = {},
  ): Promise<{ applied: number }> {
    const tpl = await this.prisma.businessTemplate.findUnique({
      where: { template_key },
      include: { modules: true },
    });
    if (!tpl) throw new NotFoundException(`Template ${template_key} não existe.`);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException(`Empresa ${companyId} não existe.`);

    if (opts.replaceExisting) {
      await this.prisma.companyModuleOverride.deleteMany({
        where: { companyId },
      });
    }

    let applied = 0;
    for (const tm of tpl.modules) {
      await this.prisma.companyModuleOverride.upsert({
        where: {
          companyId_module_key: { companyId, module_key: tm.module_key },
        },
        update: { enabled: tm.enabled },
        create: {
          companyId,
          module_key: tm.module_key,
          enabled: tm.enabled,
        },
      });
      applied++;
    }

    await this.featureFlag.invalidate(companyId);
    return { applied };
  }
}
