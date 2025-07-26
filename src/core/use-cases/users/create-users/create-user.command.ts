import { CreateUserDto } from "src/modules/user/dtos/create-user.dto";

export class CreateUserCommand {
    constructor(public readonly dto: CreateUserDto) { }
}