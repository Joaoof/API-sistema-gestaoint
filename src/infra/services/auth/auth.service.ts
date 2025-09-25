import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ValidateInputZod } from './validate-zod.service';
import { FindValidateUser } from './find-validate.service';
import { CreateTokenService } from './create-token.service';
import { UserDtoService } from './user-dto.service';
import { LoginUserDto } from 'src/modules/auth/dto/login.dto';
import { RedisService } from 'src/infra/cache/redis.service';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly validateInputZod: ValidateInputZod,
        private readonly findAndValidateUser: FindValidateUser,
        private readonly createTokenService: CreateTokenService,
        private readonly buildUserDto: UserDtoService,
        private readonly redisService: RedisService,
        private readonly prisma: PrismaService,
    ) { }

    async login(dto: LoginUserDto): Promise<any> {
        const t0 = Date.now();

        // 1) Validação de input
        const { email, password_hash } = await this.validateInputZod.isValid(dto);
        const t1 = Date.now();

        const cacheKey = `login_view:${email}`;

        // 2) Tentar cache
        const cached = await this.redisService.get(cacheKey);
        const t2 = Date.now();
        if (cached) {
            try {
                const viewData = JSON.parse(cached);
                const t3 = Date.now();
                if (viewData?.user_id && viewData?.user_email) {
                    console.debug('login timings (cache hit)', {
                        validateInput: t1 - t0,
                        cacheGet: t2 - t1,
                        cacheParse: t3 - t2,
                        total: t3 - t0,
                    });
                    return this.buildResponseFromView(viewData);
                } else {
                    await this.redisService.delete(cacheKey);
                }
            } catch {
                await this.redisService.delete(cacheKey);
            }
        }

        // 3) Validação de credenciais (Users)
        const user = await this.findAndValidateUser.isValid(email, password_hash);
        const t4 = Date.now();
        if (!user?.id) {
            throw new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED);
        }

        // 4) Única consulta na materialized view
        const viewData = await this.prisma.authLoginView.findFirst({
            where: { user_email: user.email },
        });
        const t5 = Date.now();

        if (!viewData?.user_id) {
            throw new HttpException('Dados de login não encontrados', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // 5) Cachear resultado
        await this.redisService.setWithPipeline(cacheKey, viewData, 900);
        const t6 = Date.now();

        console.debug('login timings (cache miss)', {
            validateInput: t1 - t0,
            cacheGet: t2 - t1,
            credentialValidation: t4 - t2,
            viewQuery: t5 - t4,
            cacheSet: t6 - t5,
            total: t6 - t0,
        });

        // 6) Responder
        return this.buildResponseFromView(viewData);
    }

    private buildResponseFromView(viewData: any) {
        if (!viewData.user_id || !viewData.user_email) {
            throw new HttpException('Dados de sessão inválidos', HttpStatus.INTERNAL_SERVER_ERROR);
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
