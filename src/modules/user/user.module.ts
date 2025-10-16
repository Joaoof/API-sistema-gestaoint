import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CommandBus } from '@nestjs/cqrs';
import { RedisModule } from '../../infra/cache/redis.module';
import { AuthService } from '../../infra/services/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserResolver } from '../../infra/graphql/resolvers/user.resolver';
import { FindValidateUser } from '../../infra/services/auth/find-validate.service';
import { GetCompanyService } from '../../infra/services/auth/get-company.service';
import { GetPlanService } from '../../infra/services/auth/get-plan.service';
import { ValidatePassword } from '../../infra/services/auth/validate-password.service';
import { ValidateInputZod } from '../../infra/services/auth/validate-zod.service';
import { CreateTokenService } from '../../infra/services/auth/create-token.service';
import { UserDtoService } from '../../infra/services/auth/user-dto.service';
import { GetByIdUserService } from '../../infra/services/auth/get-by-id.service';
import { ChangePasswordUseCase } from 'src/core/use-cases/users/change-password.use-case';
import { PrismaCashMovementRepository } from 'src/infra/database/implementations/cashMovement/cash-movement.prisma.repository';

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
    CreateTokenService,
    UserDtoService,
    UserResolver,
    GetByIdUserService,
    ChangePasswordUseCase,
    {
      provide: 'UserRepository',
      useClass: PrismaCashMovementRepository
    }
  ],
  exports: [
    AuthService,
    JwtService,
    FindValidateUser,
    GetCompanyService,
    GetPlanService,
    ValidatePassword,
    ValidateInputZod,
    CreateTokenService,
    UserDtoService,
  ],
})
export class UserModule { }
