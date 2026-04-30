import { Module } from '@nestjs/common';
import { PrismaCompaniesRepository } from '../../infra/database/implementations/company/company.prisma.repository';
import { FindCompanyByIdUseCase } from '../../core/use-cases/company/find-company-by-id.use-case';
import { UpdateCompanyUseCase } from '../../core/use-cases/company/update-company.use-case';
import { CompaniesResolver } from '../../infra/graphql/resolvers/companies.resolver';
import { RedisModule } from '../../infra/cache/redis.module';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [
    {
      provide: 'CompaniesRepository',
      useClass: PrismaCompaniesRepository,
    },
    FindCompanyByIdUseCase,
    UpdateCompanyUseCase,
    CompaniesResolver,
  ],
})
export class CompanyModule {}
