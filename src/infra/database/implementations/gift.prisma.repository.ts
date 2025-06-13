import { Gift } from '@/core/entities/gift';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import { GiftsRepository } from '@/core/repositories/gift.repository';

export class PrismaGiftsRepository implements GiftsRepository {
    constructor(private prisma: PrismaService) { }

    async create(gift: Gift): Promise<void> {
        await this.prisma.gift.create({ data: gift });
    }

    async findById(id: string): Promise<Gift | null> {
        const data = await this.prisma.gift.findUnique({ where: { id } });
        return data ? new Gift(data) : null;
    }

    async findAll(): Promise<Gift[]> {
        const gifts = await this.prisma.gift.findMany();
        return gifts.map((g) => new Gift(g));
    }
}