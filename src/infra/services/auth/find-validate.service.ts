import { PrismaService } from "prisma/prisma.service";
import { InvalidCredentialsError } from "src/core/exceptions/invalid-credentials.exception";
import { ValidatePassword } from "./validate-password.service";
import { User } from "src/core/entities/user.entity";
import { Injectable } from "@nestjs/common";

@Injectable()
export class FindValidateUser {
    constructor(
        private readonly prisma: PrismaService,
        private readonly validatePassword: ValidatePassword
    ) { }

    async isValid(email: string, passwordInput: string): Promise<User> {
        const userRecord = await this.prisma.users.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                password_hash: true,
                role: true,
                company_id: true,
            }
        });

        if (!userRecord) {
            throw new InvalidCredentialsError();
        }

        // 2️⃣ Validar senha
        const isValid = await this.validatePassword.isValid(
            userRecord.password_hash,
            passwordInput
        );
        if (!isValid) {
            throw new InvalidCredentialsError();
        }

        return {
            id: userRecord.id,
            email: userRecord.email,
            password_hash: userRecord.password_hash,
            role: userRecord.role,
            company_id: userRecord.company_id,
            is_active: true,     // ou conforme entidade
            createdAt: null      // preencher se necessário
        } as User;
    }
}
