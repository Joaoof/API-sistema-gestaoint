import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ValidateInputZod } from './validate-zod.service';
import { FindValidateUser } from './find-validate.service';
import { CreateTokenService } from './create-token.service';
import { UserDtoService } from './user-dto.service';
import { LoginUserDto } from 'src/core/use-cases/dtos/login-dto.core';
import { RedisService } from '../../../infra/cache/redis.service';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly validateInputZod: ValidateInputZod;
  private readonly findAndValidateUser: FindValidateUser;
  private readonly createTokenService: CreateTokenService;
  private readonly buildUserDto: UserDtoService;
  private readonly redisService: RedisService;
  private readonly prisma: PrismaService;
  constructor(
    validateInputZod: ValidateInputZod,
    findAndValidateUser: FindValidateUser,
    createTokenService: CreateTokenService,
    buildUserDto: UserDtoService,
    redisService: RedisService,
    prisma: PrismaService,
  ) {
    this.validateInputZod = validateInputZod;
    (this.findAndValidateUser = findAndValidateUser),
      (this.createTokenService = createTokenService),
      (this.buildUserDto = buildUserDto),
      (this.redisService = redisService),
      (this.prisma = prisma);
  }

  async login(dto: LoginUserDto): Promise<any> {
    const { email, password_hash } = await this.validateInputZod.isValid(dto);

    const cacheKey = `login_view:${email}`;

    // 2) Tentar cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        const viewData = JSON.parse(cached);
        if (viewData?.user_id && viewData?.user_email) {
          return this.buildResponseFromView(viewData);
        } else {
          await this.redisService.delete(cacheKey);
        }
      } catch {
        await this.redisService.delete(cacheKey);
      }
    }

    const user = await this.findAndValidateUser.isValid(email, password_hash);
    if (!user?.id) {
      throw new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED);
    }

    const viewData = await this.prisma.authLoginView.findFirst({
      where: { user_email: user.email },
    });

    if (!viewData?.user_id) {
      throw new HttpException(
        'Dados de login não encontrados',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.redisService.setWithPipeline(cacheKey, viewData, 900);
    return this.buildResponseFromView(viewData);
  }

  private buildResponseFromView(viewData: any) {
    if (!viewData.user_id || !viewData.user_email) {
      throw new HttpException(
        'Dados de sessão inválidos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return Promise.all([
      this.createTokenService.isCreated({
        id: viewData.user_id,
        email: viewData.user_email,
        role: viewData.user_role ?? 'user',
      }),
      this.buildUserDto.buildUserDto(
        {
          id: viewData.user_id,
          email: viewData.user_email,
          role: viewData.user_role ?? 'user',
          company_id: viewData.company_id,
        },
        {
          id: viewData.company_id,
          name: viewData.company_name,
          logoUrl: viewData.company_logo,
        },
        {
          id: viewData.plan_id,
          name: viewData.plan_name,
          modules: viewData.modules,
        },
      ),
    ]).then(([token, userDto]) => ({
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
      user: userDto,
    }));
  }
}
