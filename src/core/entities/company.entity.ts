import { CompanyDto } from 'src/infra/graphql/dto/company.dto';
import { CompanyModule } from 'src/modules/company/company.module';

export class Company {
  constructor(
    public id: string,
    public name?: string,
    public email?: string,
    public phone?: string,
    public address?: string,
    public logoUrl?: string,
    public createdAt?: Date,
    public updatedAt?: Date,
  ) {}

  // Método estático pra converter do formato do Prisma pro formato da entity
  static fromPrisma(data: CompanyDto): Company {
    return new Company(
      data.id,
      data.name,
      data.email,
      data.phone,
      data.address,
      data.logoUrl,
    );
  }
}
