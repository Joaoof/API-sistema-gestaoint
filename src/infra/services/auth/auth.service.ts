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

            const user = await this.findAndValidateUser.isValid(email, password_hash);

            const viewData = await this.prisma.authLoginView.findFirst({
                where: { user_email: user.email },
            });

            if (!viewData) {
                throw new Error('Dados de login não encontrados');
            }

            const [company, planDto] = await Promise.all([
                this.fetchCompany.getCompanyById(user.company_id ?? ''),
                this.fetchPlan.getPlanByCompanyId(user.company_id ?? ''),
            ]);

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

            await this.redisService.setWithPipeline(
                cacheKey,
                viewData,
                900 // 15 minutos
            );

            const response = {
                accessToken: (await token).accessToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
                user: userDto,
            };

            return response;

        } catch (error) {
            console.error('Login error:', error);

            if (error.message?.includes('Redis')) {
                console.warn('Redis unavailable, proceeding without cache');
            }

            throw error;
        }
    }
}
