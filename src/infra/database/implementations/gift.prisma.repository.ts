import { Gift } from 'src/core/entities/gifts.entity';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GiftsRepository } from '../../../core/ports/gift.repository';

export class PrismaGiftsRepository implements GiftsRepository {
    constructor(private prisma: PrismaService) { }

    async create(gift: Gift): Promise<void> {
        await this.prisma.gift.create({ data: gift });
    }

    async findById(id: string): Promise<Gift | null> {
        const data = await this.prisma.gift.findUnique({ where: { id } });
        return data ? Gift.fromPrisma(data) : null;
    }

    async findAll(): Promise<Gift[]> {
        const gifts = await this.prisma.gift.findMany();
        return gifts.map((data) => Gift.fromPrisma(data));
    }
}