import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ValidateInputZod } from './validate-zod.service';
import { FindValidateUser } from './find-validate.service';
import { GetCompanyService } from './get-company.service';
import { GetPlanService } from './get-plan.service';
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
        private readonly fetchCompany: GetCompanyService,
        private readonly fetchPlan: GetPlanService,
        private readonly _createToken: CreateTokenService,
        private readonly buildUserDto: UserDtoService,
        private readonly redisService: RedisService,
        private readonly prisma: PrismaService,
    ) { }

    async login(loginUserDto: LoginUserDto): Promise<any> {
        try {
            // 1) Validar input
            const { email, password_hash } = await this.validateInputZod.isValid(loginUserDto);
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

            // 3) Validar credenciais (Users)
            const user = await this.findAndValidateUser.isValid(email, password_hash);
            if (!user?.id) {
                throw new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED);
            }

            // 4) Buscar view (pode retornar null)
            const viewData = await this.prisma.authLoginView.findFirst({
                where: { user_email: user.email },
            });

            // 5) Se não houver view, usar fallback com serviços (company/plan)
            if (!viewData?.user_id) {
                // Fallback seguro: buscar company e plan
                const [company, planDto] = await Promise.all([
                    this.fetchCompany.getCompanyById(user.company_id ?? ''),
                    this.fetchPlan.getPlanByCompanyId(user.company_id ?? ''),
                ]);

                // Token
                const token = await this._createToken.isCreated({
                    id: user.id,
                    email: user.email,
                    role: user.role,
                });

                // DTO
                const userDto = await this.buildUserDto.buildUserDto(
                    {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        company_id: user.company_id,
                    },
                    company ?? null,
                    planDto ?? null,
                );

                return {
                    accessToken: token.accessToken,
                    expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
                    user: userDto,
                };
            }

            // 6) Cachear view válida
            await this.redisService.setWithPipeline(cacheKey, viewData, 900);

            // 7) Resposta baseada na view (mais rápida)
            return this.buildResponseFromView(viewData);

        } catch (error) {
            console.error('Login error:', error);
            if (typeof error?.message === 'string' && error.message.includes('Redis')) {
                console.warn('Redis unavailable, proceeding without cache');
            }
            throw error;
        }
    }

    private buildResponseFromView(viewData: any) {
        // Guardas de segurança
        if (!viewData?.user_id || !viewData?.user_email) {
            throw new HttpException('Dados de sessão inválidos', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Token
        const tokenPromise = this._createToken.isCreated({
            id: viewData.user_id,
            email: viewData.user_email,
            role: viewData.user_role ?? 'user',
        });

        // DTO
        const userDtoPromise = this.buildUserDto.buildUserDto(
            {
                id: viewData.user_id,
                email: viewData.user_email,
                role: viewData.user_role ?? 'user',
                company_id: viewData.company_id ?? null,
            },
            {
                id: viewData.company_id ?? null,
                name: viewData.company_name ?? null,
                logoUrl: viewData.company_logo ?? null,
            },
            {
                id: viewData.plan_id ?? null,
                name: viewData.plan_name ?? null,
                modules: Array.isArray(viewData.modules) ? viewData.modules : [],
            },
        );

        return Promise.all([tokenPromise, userDtoPromise]).then(([token, userDto]) => ({
            accessToken: token.accessToken,
            expiresIn: token.expiresIn,
            user: userDto,
        }));
    }
}
