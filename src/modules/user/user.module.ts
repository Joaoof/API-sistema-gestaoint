import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { CommandBus } from "@nestjs/cqrs";
import { RedisModule } from "src/infra/cache/redis.module";
import { AuthService } from "src/infra/services/auth/auth.service";
import { JwtService } from "@nestjs/jwt";
import { UserResolver } from "src/infra/graphql/resolvers/user.resolver";
import { FindValidateUser } from "src/infra/services/auth/find-validate.service";
import { GetCompanyService } from "src/infra/services/auth/get-company.service";
import { GetPlanService } from "src/infra/services/auth/get-plan.service";
import { ValidatePassword } from "src/infra/services/auth/validate-password.service";
import { ValidateInputZod } from "src/infra/services/auth/validate-zod.service";

@Module({
    imports: [PrismaModule, RedisModule],
    providers: [
        CommandBus,
        AuthService,
        JwtService,
        FindValidateUser,
        GetCompanyService,
        GetPlanService,
        ValidatePassword,
        ValidateInputZod,
        UserResolver
    ],
    exports: [AuthService, JwtService, FindValidateUser, GetCompanyService, GetPlanService, ValidatePassword, ValidateInputZod]
})

export class UserModule { }