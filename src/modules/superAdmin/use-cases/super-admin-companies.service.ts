import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CompanyAdminDto, CreateCompanyAdminInput, ListCompaniesInput } from '../dto/super-admin.dto';

@Injectable()
export class SuperAdminCompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input?: ListCompaniesInput): Promise<CompanyAdminDto[]> {
    const where: any = {};
    if (input?.status === 'ACTIVE') where.is_active = true;
    if (input?.status === 'SUSPENDED') where.is_active = false;
    if (input?.search) {
      where.OR = [
        { name: { contains: input.search, mode: 'insensitive' } },
        { cnpj: { contains: input.search } },
        { email: { contains: input.search, mode: 'insensitive' } },
      ];
    }

    const companies = await this.prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: input?.take ?? 100,
      skip: input?.skip ?? 0,
      include: {
        companyPlan: { include: { plan: { select: { name: true } } } },
        _count: { select: { Users: true } },
      },
    });

    const since30d = new Date(Date.now() - 30 * 86400_000);

    // Calcula MRR estimado via movimentações de caixa positivas dos últimos 30d
    const revenuePerCompany = await this.prisma.cashMovement.groupBy({
      by: ['companyId'],
      _sum: { value: true },
      where: {
        companyId: { in: companies.map((c) => c.id) },
        type: 'ENTRY' as any,
        date: { gte: since30d },
      },
    });
    const revMap = new Map(
      revenuePerCompany.map((r) => [r.companyId, Number(r._sum.value ?? 0)]),
    );

    // Última atividade = audit log mais recente
    const lastLogs = await this.prisma.auditLog.groupBy({
      by: ['companyId'],
      _max: { createdAt: true },
      where: { companyId: { in: companies.map((c) => c.id) } },
    });
    const lastMap = new Map(
      lastLogs.map((l) => [l.companyId, l._max.createdAt ?? null]),
    );

    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      cnpj: c.cnpj,
      email: c.email,
      phone: c.phone,
      logoUrl: c.logoUrl,
      isActive: c.is_active ?? true,
      plan: c.companyPlan?.plan?.name ?? null,
      usersCount: c._count.Users,
      revenue30d: revMap.get(c.id) ?? 0,
      createdAt: c.createdAt,
      lastActivityAt: lastMap.get(c.id) ?? null,
    }));
  }

  async create(_actorUserId: string, input: CreateCompanyAdminInput) {
    const exists = await this.prisma.company.findFirst({
      where: { OR: [{ name: input.name }, ...(input.cnpj ? [{ cnpj: input.cnpj }] : [])] },
    });
    if (exists) throw new BadRequestException('Empresa com mesmo nome ou CNPJ já existe.');

    const company = await this.prisma.company.create({
      data: {
        name: input.name,
        cnpj: input.cnpj,
        email: input.email,
        phone: input.phone,
        is_active: true,
      },
    });

    if (input.planId) {
      await this.prisma.companyPlan.create({
        data: { company_id: company.id, planId: input.planId, isActive: true },
      });
    }

    return company;
  }

  async setActive(id: string, isActive: boolean) {
    return this.prisma.company.update({
      where: { id },
      data: { is_active: isActive },
    });
  }
}
