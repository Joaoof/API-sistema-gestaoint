import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
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
        const cached = await this.redis.get(`company:${id}`);
        if (cached) return Company.fromPrisma(JSON.parse(cached));

        const data = await this.prisma.company.findUnique({ where: { id } });
        if (!data) return null;

        const company = Company.fromPrisma(data);
        await this.redis.setex(`company:${id}`, 30, JSON.stringify(company));
        return company;
    }
}
