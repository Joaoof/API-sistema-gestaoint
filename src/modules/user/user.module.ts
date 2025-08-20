import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { CommandBus } from "@nestjs/cqrs";
import { RedisModule } from "src/infra/cache/redis.module";
import { AuthService } from "src/infra/services/auth/auth.service";
import { JwtService } from "@nestjs/jwt";
import { UserResolver } from "src/infra/graphql/resolvers/user.resolver";

@Module({
    imports: [PrismaModule, RedisModule],
    providers: [
        CommandBus,
        AuthService,
        JwtService,
        UserResolver
    ],
    exports: [AuthService]
})

export class UserModule { }