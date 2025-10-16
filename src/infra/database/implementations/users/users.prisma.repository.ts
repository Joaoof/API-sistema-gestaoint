import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { UserRepository } from "src/core/ports/user.repository";
import { RedisService } from "src/infra/cache/redis.service";
import * as argon2 from 'argon2';
import { ChangePasswordInput } from '../../../../core/use-cases/cashMovement/dtos/change-password.input';


@Injectable()
export class PrismaUserRepository implements UserRepository {

    constructor(private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {
        this.prisma = prisma;
        this.redis = redis;
    }

    async findById(userId: string): Promise<any | null> {
        return this.prisma.users.findUnique({
            where: { id: userId },
            // Selecione todos os campos necessários pelo Use Case, incluindo a hash
            select: {
                id: true,
                email: true,
                password_hash: true // ESSENCIAL para a verificação de senha no Use Case
                // Adicione outros campos necessários aqui
            }
        });
    }

    async changePassword(userId: string, input: ChangePasswordInput): Promise<string> {
        const searchId = await this.prisma.users.findUnique({
            where: { id: userId },
            select: { id: true }
        })

        const hashPassword = await argon2.hash(input.newPassword);

        const updatePasswordUser = await this.prisma.users.update({
            where: { id: userId },
            data: {
                password_hash: hashPassword
            }
        })
        if (!searchId) return 'Usuário não encontrado';

        await this.redis.delete('user_data' + userId)

        return `SENHA ALTERADA COM SUCESSO ${updatePasswordUser}`;
    }
}
