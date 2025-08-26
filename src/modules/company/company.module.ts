// src/core/company/company.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

import { PrismaCompaniesRepository } from 'src/infra/database/implementations/company/company.prisma.repository';
import { FindCompanyByIdUseCase } from 'src/core/use-cases/company/find-company-by-id.use-case';

import { CompaniesResolver } from 'src/infra/graphql/resolvers/companies.resolver';
import { RedisService } from 'src/infra/cache/redis.service';
import { RedisModule } from 'src/infra/cache/redis.module';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
    imports: [PrismaModule, RedisModule],
    providers: [
        {
            provide: 'CompaniesRepository',
            useClass: PrismaCompaniesRepository,
        },

        FindCompanyByIdUseCase,
        CompaniesResolver,
    ],
    exports: [FindCompanyByIdUseCase],
})
export class CompanyModule { }
