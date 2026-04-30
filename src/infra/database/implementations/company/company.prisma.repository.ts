import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  CompaniesRepository,
  UpdateCompanyData,
} from 'src/core/ports/company.repository';
import { Company } from 'src/core/entities/company.entity';

@Injectable()
export class PrismaCompaniesRepository implements CompaniesRepository {
  private readonly prisma: PrismaService;
  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  async findById(id: string): Promise<Company | null> {
    const data = await this.prisma.company.findUnique({ where: { id } });
    if (!data) return null;

    return Company.fromPrisma({
      id: data.id,
      name: data.name,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      address: data.address ?? undefined,
      cnpj: data.cnpj ?? undefined,
      logoUrl: data.logoUrl ?? undefined,
      nomeFantasia: data.nomeFantasia ?? undefined,
      razaoSocial: data.razaoSocial ?? undefined,
      inscricaoEstadual: data.inscricaoEstadual ?? undefined,
      bairro: data.bairro ?? undefined,
      cidade: data.cidade ?? undefined,
      estado: data.estado ?? undefined,
    });
  }

  async update(id: string, data: UpdateCompanyData): Promise<Company> {
    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.cnpj !== undefined ? { cnpj: data.cnpj } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.nomeFantasia !== undefined ? { nomeFantasia: data.nomeFantasia } : {}),
        ...(data.razaoSocial !== undefined ? { razaoSocial: data.razaoSocial } : {}),
        ...(data.inscricaoEstadual !== undefined
          ? { inscricaoEstadual: data.inscricaoEstadual }
          : {}),
        ...(data.bairro !== undefined ? { bairro: data.bairro } : {}),
        ...(data.cidade !== undefined ? { cidade: data.cidade } : {}),
        ...(data.estado !== undefined ? { estado: data.estado } : {}),
      },
    });

    return Company.fromPrisma({
      id: updated.id,
      name: updated.name,
      email: updated.email ?? undefined,
      phone: updated.phone ?? undefined,
      address: updated.address ?? undefined,
      cnpj: updated.cnpj ?? undefined,
      logoUrl: updated.logoUrl ?? undefined,
      nomeFantasia: updated.nomeFantasia ?? undefined,
      razaoSocial: updated.razaoSocial ?? undefined,
      inscricaoEstadual: updated.inscricaoEstadual ?? undefined,
      cidade: updated.cidade ?? undefined,
      estado: updated.estado ?? undefined,
    });
  }
}
