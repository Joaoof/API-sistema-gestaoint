import { PrismaService } from "prisma/prisma.service";
import { Auth } from "src/core/entities/user.entity";
import { AuthRepository } from "src/core/ports/user.repository";
import { RedisService } from "src/infra/cache/redis.service";

export class PrismaAuthRepository implements AuthRepository {

    constructor(private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ) { }

    async create(auth: Auth): Promise<void> {
        await this.prisma.users.create({
            data: {
                name: auth.name,
                email: auth.email,
                password_hash: auth.password_hash,
                is_active: auth.is_active,
                role: auth.role,
                company: auth.company as any
            }
        });
    }
    async findAll(): Promise<Auth[]> {
        throw new Error("Method not implemented.");
    }
    async findById(id: string): Promise<Auth | null> {
        throw new Error("Method not implemented.");
    }
    async findByEmail(email: string): Promise<Auth | null> {
        throw new Error("Method not implemented.");
    }
    async update(auth: Auth): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async delete(id: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

}