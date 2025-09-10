import { HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { Company } from "src/core/entities/company.entity";
import { RedisService } from "src/infra/cache/redis.service";

@Injectable()
export class GetCompanyService {
    constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) { }

    async getCompanyById(companyId: string): Promise<Company | null> {
        const cachePrefix = "auth:company";
        const cacheKey = companyId;

        const cached = await this.redis.get(cachePrefix, cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true, 
                logoUrl: true,
            }
        })

        console.log('🏢 Empresa encontrada:', company);


        if (!company) {
            throw new HttpException("Empresa não encontrada", 403);
        }

        await this.redis.setWithExpiry("auth:company", companyId, JSON.stringify(company), 10000)

        return {
            ...company,
            logoUrl: company.logoUrl === null ? undefined : company.logoUrl,
        };
    }
}