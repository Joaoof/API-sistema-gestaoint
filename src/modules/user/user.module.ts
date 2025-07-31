import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { CommandBus } from "@nestjs/cqrs";
import { RedisModule } from "src/infra/cache/redis.module";
import { PrismaUserRepository } from "src/infra/database/implementations/users/users.prisma.repository";
import { AuthService } from "src/infra/services/auth/auth.service";
import { JwtService } from "@nestjs/jwt";

@Module({
    imports: [PrismaModule, RedisModule],
    providers: [
        CommandBus,
        {
            provide: 'UsersRepository',
            useClass: PrismaUserRepository, // Ensure this is the correct implementation
        },
        AuthService,
        JwtService
    ],
    exports: [AuthService]
})

export class UserModule { }