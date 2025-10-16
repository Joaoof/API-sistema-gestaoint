import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from 'src/core/exceptions/api.exception';
import { UserRepository } from 'src/core/ports/user.repository';
import * as argon2 from 'argon2'; // Importado para verificação de senha
import { ChangePasswordInput } from '../cashMovement/dtos/change-password.input'; // DTO completo
import { InvalidCredentialsError } from 'src/core/exceptions/invalid-credentials.exception';

@Injectable()
export class ChangePasswordUseCase {
    private readonly userRepository: UserRepository;

    // Injeção usando o token, se necessário, ou a classe (ideal)
    constructor(@Inject('UserRepository') userRepository: UserRepository) {
        this.userRepository = userRepository;
    }

    // O Use Case agora aceita o DTO de Input completo do GraphQL
    async execute(userId: string, input: ChangePasswordInput): Promise<string> {
        if (input.newPassword !== input.confirmPassword) {
            throw new InvalidCredentialsError();
        }
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new NotFoundError(`Usuário não encontrado.`, 404);
        }

        const isCurrentPasswordValid = await argon2.verify(user.password_hash, input.currentPassword);

        if (!isCurrentPasswordValid) {
            throw new InvalidCredentialsError();
        }

        const result = await this.userRepository.changePassword(userId, input);

        return result;
    }
}
