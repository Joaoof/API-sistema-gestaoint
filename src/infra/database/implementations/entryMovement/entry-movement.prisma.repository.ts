import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { EntryMovement } from "src/core/entities/entry-movement.entity";
import { EntryMovementRepository } from "src/core/ports/entry-movement.repository";
import { RedisService } from "src/infra/cache/redis.service";

@Injectable()
export class PrismaEntryMovementRepository implements EntryMovementRepository {
    constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) { }
    async create(entryMovement: EntryMovement): Promise<void> {
        await this.prisma.entryMovement.create({
            data: {
                typeEntry: entryMovement.typeEntry,
                value: entryMovement.value,
                description: entryMovement.description,
                user_id: entryMovement.user_id,
                createdAt: entryMovement.createdAt,
            },
        });
    }

    async findById(id: string): Promise<EntryMovement | null> {
        const cached = await this.redis.get(`entryMovement:${id}`);
        if (cached) return EntryMovement.fromPrisma(JSON.parse(cached));

        const data = await this.prisma.entryMovement.findUnique({ where: { id } });
        if (!data) return null;

        const entryMovement = EntryMovement.fromPrisma(data);
        await this.redis.setex(`entryMovement:${id}`, 120, JSON.stringify(entryMovement));
        return entryMovement;
    }

    async findAll(): Promise<EntryMovement[]> {
        const cached = await this.redis.get('entryMovement:all');
        if (cached) return JSON.parse(cached).map(EntryMovement.fromPrisma);

        const entries = await this.prisma.entryMovement.findMany();

        await this.redis.setex('entryMovement:all', 120, JSON.stringify(entries));
        return entries.map(EntryMovement.fromPrisma);
    }

}