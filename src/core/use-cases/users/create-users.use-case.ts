import { UserRepository } from "src/core/ports/user.repository";
import { CreateUserDto } from "src/modules/user/dtos/create-user.dto";
import { User } from "src/core/entities/user.entity";

export class CreateUsersUseCase {
    constructor(private readonly createRepository: UserRepository) { }

    async execute(input: CreateUserDto): Promise<void> {
        return await this.createRepository.create(input)
    }
}