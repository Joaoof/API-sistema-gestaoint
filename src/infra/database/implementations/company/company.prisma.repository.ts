import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { RedisService } from 'src/infra/cache/redis.service';
import { CompaniesRepository } from 'src/core/ports/company.repository';
import { Company } from 'src/core/entities/company.entity';

@Injectable()
export class PrismaCompaniesRepository implements CompaniesRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) { }

    async findById(id: string): Promise<Company | null> {
        // const key = `companyId`;

        // const cached = await this.redis.get(key);
        // console.log('JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ', cached);

        // if (cached) {
        //     return Company.fromPrisma(JSON.parse(cached));
        // }

        const data = await this.prisma.company.findUnique({ where: { id } });
        if (!data) return null;

        const company = Company.fromPrisma({
            id: data.id,
            name: data.name,
            logoUrl: data.logoUrl ?? ''

        });

        // Se você quiser expiração de 30 segundos:
        // await this.redis.set(key, company, 3600); // usa nosso método seguro

        return company;
    }

}
