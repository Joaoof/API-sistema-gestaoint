import { HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from '../../../../prisma/prisma.service';
import { Company } from "src/core/entities/company.entity";
import { RedisService } from "src/infra/cache/redis.service";

@Injectable()
export class GetCompanyService {
    constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) { }

    async getCompanyById(companyId: string): Promise<Company | null> {
        const cachePrefix = `auth:company:${companyId}`;

        const cached = await this.redis.get(cachePrefix);

        if (cached) {
            return JSON.parse(cached);
        }

        const data = await this.prisma.company.findUnique({ where: { id: companyId } });

        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                logoUrl: true,
            }
        })

        if (!company) {
            throw new HttpException("Empresa não encontrada", 403);
        }

        await this.redis.set(`auth:company:{companyId}`, 3600)

        return {
            ...company,
            logoUrl: company.logoUrl === null ? undefined : company.logoUrl,
        };
    }
}