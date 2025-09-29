import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { CompaniesRepository } from 'src/core/ports/company.repository';
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

    const company = Company.fromPrisma({
      id: data.id,
      name: data.name,
      logoUrl: data.logoUrl ?? '',
    });

    return company;
  }
}
