import { PrismaService } from "prisma/prisma.service";
import { InvalidCredentialsError } from "src/core/exceptions/invalid-credentials.exception";
import { ValidatePassword } from "./validate-password.service";
import { User } from "src/core/entities/user.entity";
import { Injectable } from "@nestjs/common";

@Injectable()
export class FindValidateUser {
    constructor(private readonly prisma: PrismaService, private readonly validatePassword: ValidatePassword) { }

    async isValid(email: string, passwordInput: string): Promise<User> {
        try {

            const teste = await this.prisma.
            const user = await this.prisma.users.findUnique({
                where: { email },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    password_hash: true,
                    company_id: true,
                }
            })

            if (!user) {
                throw new InvalidCredentialsError();
            }

            const validPassword = await this.validatePassword.isValid(user.password_hash, passwordInput);

            if (!validPassword) {
                throw new InvalidCredentialsError();
            }

            return user;

        } catch (error) {
            console.error('Erro ao validar usuário:', error);
            throw new InvalidCredentialsError();
        }
    }
}