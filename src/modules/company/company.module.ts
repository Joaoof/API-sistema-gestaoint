import { Module } from '@nestjs/common';
import { PrismaCompaniesRepository } from '../../infra/database/implementations/company/company.prisma.repository';
import { FindCompanyByIdUseCase } from 'src/core/use-cases/company/find-company-by-id.use-case';
import { CompaniesResolver } from '../../infra/graphql/resolvers/companies.resolver';
import { RedisModule } from '../../infra/cache/redis.module';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [
    {
      provide: 'CompaniesRepository', // token da interface
      useClass: PrismaCompaniesRepository,
    },
    FindCompanyByIdUseCase,
    CompaniesResolver,
  ],
})
export class CompanyModule {}
