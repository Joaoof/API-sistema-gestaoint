import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { UserController } from "./controller/user.controller";
import { CreateUserCommandHandler } from "src/core/use-cases/users/create-users/create-user.handler";
import { CommandBus } from "@nestjs/cqrs";
import { PrismaUserRepository } from "src/infra/database/implementations/users/users.prisma.repository";
import { UserResolver } from "src/infra/graphql/resolvers/user.resolver";
import { RedisModule } from "src/infra/cache/redis.module";

@Module({
    imports: [PrismaModule, RedisModule],
    // controllers: [UserController],
    providers: [CreateUserCommandHandler,
        CommandBus,
        UserResolver,
        {
            provide: 'UsersRepository',
            useClass: PrismaUserRepository, // Ensure this is the correct implementation
        }
    ],
    exports: [
        CreateUserCommandHandler,
    ]
})

export class UserModule { }