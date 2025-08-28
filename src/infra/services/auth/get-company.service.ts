import { HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { Company } from "src/core/entities/company.entity";
import { RedisService } from "src/infra/cache/redis.service";

@Injectable()
export class GetCompanyService {
    constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) { }

    async getCompanyById(companyId: string): Promise<Company | null> {
        const cacheKey = `auth:company:${companyId}`;

        const cached = await this.redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                logoUrl: true,
            }
        })

        if (!company) {
            throw new HttpException("Empresa não encontrada", 403);
        }

        await this.redis.setex(cacheKey, 10000, JSON.stringify(company))

        return {
            ...company,
            logoUrl: company.logoUrl === null ? undefined : company.logoUrl,
        };
    }
}