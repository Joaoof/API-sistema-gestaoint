import { Injectable } from '@nestjs/common';
import { ValidateInputZod } from './validate-zod.service';
import { FindValidateUser } from './find-validate.service';
import { GetCompanyService } from './get-company.service';
import { GetPlanService } from './get-plan.service';
import { CreateTokenService } from './create-token.service';
import { UserDtoService } from './user-dto.service';
import { LoginUserDto } from 'src/modules/auth/dto/login.dto';
import { GetByIdUserService } from './get-by-id.service';
import { RedisService } from 'src/infra/cache/redis.service';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly getById: GetByIdUserService,
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
            const { email, password_hash } = await this.validateInputZod.isValid(loginUserDto);
            const cacheKey = `login_view:${email}`;

            // 🔍 Verificar cache primeiro
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                const { user, company, planDto } = JSON.parse(cachedData);

                const token = this._createToken.isCreated({
                    id: user.id,
                    email: user.email,
                    role: user.role,
                });

                const userDto = await this.buildUserDto.buildUserDto({
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    company_id: user.company_id,
                }, company, planDto);

                return {
                    accessToken: (await token).accessToken,
                    expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
                    user: userDto,
                };
            }

            // 🔍 Cache miss - buscar dados no banco
            const user = await this.findAndValidateUser.isValid(email, password_hash);

            const viewData = await this.prisma.authLoginView.findUnique({
                where: { user_email: user.email || '' },
            });
            if (!viewData) {
                throw new Error('Dados de login não encontrados');
            }

            // 🚀 Buscar dados relacionados em paralelo
            const [company, planDto] = await Promise.all([
                this.fetchCompany.getCompanyById(user.company_id ?? ''),
                this.fetchPlan.getPlanByCompanyId(user.company_id ?? ''),
            ]);

            // 🔐 Criar token (SEM password_hash)
            const token = this._createToken.isCreated({
                id: user.id,
                email: user.email,
                role: user.role,
                // ✅ REMOVIDO password_hash por segurança
            });

            // 👤 Construir DTO do usuário
            const userDto = await this.buildUserDto.buildUserDto({
                id: user.id,
                email: user.email,
                role: user.role,
                company_id: user.company_id,
            }, company, planDto);

            // 💾 Cachear dados completos (ORDEM CORRETA)
            await this.redisService.set(
                cacheKey,
                JSON.stringify({ user, company, planDto }),
                900 // 15 minutos
            );

            // 📤 Retornar response completo
            const response = {
                accessToken: (await token).accessToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
                user: userDto,
            };

            return response;

        } catch (error) {
            // 🚨 Log do erro para debug
            console.error('Login error:', error);

            // Se Redis falhar, continuar sem cache
            if (error.message?.includes('Redis')) {
                console.warn('Redis unavailable, proceeding without cache');
                // Implementar fallback sem cache aqui
            }

            throw error;
        }
    }
}
