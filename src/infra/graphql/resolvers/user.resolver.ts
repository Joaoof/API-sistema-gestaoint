import { Injectable } from "@nestjs/common";
import { Args, Field, InputType, Mutation, Resolver } from "@nestjs/graphql";
import { CreateUserCommand } from "src/core/use-cases/users/create-users/create-user.command";
import { CreateUserCommandHandler } from "src/core/use-cases/users/create-users/create-user.handler";
import { UserResponseDto } from "src/modules/user/dtos/reponse-user.dto";


@InputType()
export class CreateUserInput {
    @Field()
    email: string;

    @Field()
    password_hash: string;

    @Field()
    name: string

    @Field()
    company_id: string;

    @Field()
    role: string;

    @Field()
    is_active: boolean;
}


@Resolver(() => UserResponseDto)
@Injectable()
export class UserResolver {
    constructor(private readonly createUserCommandHandler: CreateUserCommandHandler) {

    }
    @Mutation(() => UserResponseDto, { name: 'createUser' })
    async createUser(@Args('dto') dto: CreateUserInput) {
        const input = {
            email: dto.email,
            password_hash: dto.password_hash,
            name: dto.name,
            company_id: dto.company_id,
            role: dto.role as any,
            is_active: dto.is_active
        }

        const user = await this.createUserCommandHandler.execute(new CreateUserCommand(input));

        return user;
    }
}