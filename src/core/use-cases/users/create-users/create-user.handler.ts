import { Inject } from "@nestjs/common";
import { ICommandHandler } from "@nestjs/cqrs";
import { UserRepository } from "src/core/ports/user.repository";
import { UserMapper } from "src/modules/user/mapper/user.mapper";
import { CreateUserCommand } from "./create-user.command";

export class CreateUserCommandHandler implements ICommandHandler<CreateUserCommand> {

    constructor(@Inject('UsersRepository') private readonly usersRepository: UserRepository) { }

    async execute(command: CreateUserCommand): Promise<void> {
        const user = UserMapper.ToDomain(command.dto);

        const save = await this.usersRepository.create(user)

        return save;
    }

}