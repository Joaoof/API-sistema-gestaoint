import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { FeatureFlagService } from './feature-flag.service';

@Injectable()
export class CompanyModuleToggleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlag: FeatureFlagService,
  ) {}

  async toggle(companyId: string, module_key: string, enabled: boolean) {
    const mod = await this.prisma.module.findUnique({ where: { module_key } });
    if (!mod) throw new NotFoundException(`Módulo ${module_key} não existe no catálogo.`);

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException(`Empresa ${companyId} não existe.`);

    const saved = await this.prisma.companyModuleOverride.upsert({
      where: { companyId_module_key: { companyId, module_key } },
      update: { enabled },
      create: { companyId, module_key, enabled },
    });

    await this.featureFlag.invalidate(companyId);
    return saved;
  }

  async listForCompany(companyId: string) {
    return this.prisma.companyModuleOverride.findMany({
      where: { companyId },
      orderBy: { module_key: 'asc' },
    });
  }
}
