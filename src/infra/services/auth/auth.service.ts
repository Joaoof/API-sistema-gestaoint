import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/auth/jwt.strategy';
import { PrismaService } from 'prisma/prisma.service';
import { Users } from '@prisma/client';
import { z } from 'zod';
import * as argon2 from 'argon2';
import { InvalidCredentialsError } from 'src/core/exceptions/invalid-credentials.exception';
import { CompanyWithoutPlanError } from 'src/core/exceptions/company-without-plan.exception';
import { DomainValidationError } from 'src/core/exceptions/domain.exception';
import { UserDto } from 'src/infra/graphql/dto/user.dto';
import { PlanDto } from 'src/infra/graphql/dto/plan.dto';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from 'src/infra/cache/redis.constants';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
    ) { }

    async login(loginUserDto: LoginUserDto): Promise<any> {
        console.time('🔐 AuthService.login completo');

        // 1. Validar entrada
        const { email, password_hash } = await this.validateInput(loginUserDto);

        // 2. Buscar e validar usuário
        const user = await this.findAndValidateUser(email, password_hash);

        // 3. Buscar empresa e plano em paralelo (operação independente)
        const [company, planDto] = await Promise.all([
            this.fetchCompany(user.company_id),
            this.fetchPlanWithCache(user.company_id),
        ]);

        // 4. Gerar token
        const token = this._createToken(user);

        // 5. Montar resposta
        const userDto = this.buildUserDto(user, company, planDto);

        console.timeEnd('🔐 AuthService.login completo');

        return {
            accessToken: token.accessToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
            user: userDto,
        };
    }

    // ✅ 1. Validação de entrada
    private async validateInput(dto: LoginUserDto): Promise<LoginUserDto> {
        console.time('📝 Validação Zod');
        const result = LoginUserSchema.safeParse(dto);
        if (!result.success) {
            const errors = result.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            console.timeEnd('📝 Validação Zod');
            console.timeEnd('🔐 AuthService.login completo');
            throw new DomainValidationError(errors);
        }
        console.timeEnd('📝 Validação Zod');
        return result.data;
    }

    // ✅ 2. Buscar usuário + validar credenciais
    private async findAndValidateUser(email: string, passwordInput: string): Promise<Users> {
        console.time('🗄️ Busca Usuário');
        const user = await this.prisma.users.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                password_hash: true,
                role: true,
                company_id: true,
                is_active: true,
                createdAt: true,
            },
        });

        if (!user) {
            console.timeEnd('🗄️ Busca Usuário');
            console.timeEnd('🔐 AuthService.login completo');
            throw new InvalidCredentialsError();
        }
        console.timeEnd('🗄️ Busca Usuário');

        // 🔑 Validação de senha
        console.time('🔑 Validação de senha');
        const isValid = await argon2.verify(user.password_hash, passwordInput);
        if (!isValid) {
            console.timeEnd('🔑 Validação de senha');
            console.timeEnd('🔐 AuthService.login completo');
            throw new InvalidCredentialsError();
        }
        console.timeEnd('🔑 Validação de senha');

        return user;
    }

    // ✅ 3. Buscar empresa
    private async fetchCompany(companyId: string) {
        console.time('🏢 Busca Empresa');
        const cacheKey = `auth:company:basic:${companyId}`;

        const cached = await this.redis.get(cacheKey);
        if (cached) {
            console.timeEnd('🏢 Busca Empresa');
            return JSON.parse(cached);
        }

        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                logoUrl: true,
            },
        });

        if (!company) {
            console.timeEnd('🏢 Busca Empresa');
            throw new HttpException('Empresa não encontrada', HttpStatus.FORBIDDEN);
        }

        await this.redis.setex(cacheKey, 3600, JSON.stringify(company));
        console.log(`✅ Empresa ${companyId} salva no cache`);

        console.timeEnd('🏢 Busca Empresa');
        return company;
    }

    // ✅ 4. Buscar plano com cache (Redis)
    private async fetchPlanWithCache(companyId: string): Promise<PlanDto> {
        console.time('🧩 Plano + Cache');
        const cacheKey = `auth:company:plan:${companyId}`;

        const cached = await this.redis.get(cacheKey);
        if (cached) {
            console.log(`✅ CACHE HIT: Plano carregado do Redis para empresa ${companyId}`);
            console.timeEnd('🧩 Plano + Cache');
            return JSON.parse(cached);
        }

        console.log(`❌ CACHE MISS: Buscando plano no banco para empresa ${companyId}`);

        const companyPlan = await this.prisma.companyPlan.findFirst({
            where: { company_id: companyId, isActive: true },
            include: {
                plan: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        module: {
                            where: { isActive: true },
                            include: {
                                module: {
                                    select: {
                                        module_key: true,
                                        name: true,
                                        description: true,
                                    }
                                }
                            },
                            select: {
                                permission: true,
                            }
                        }
                    }
                }
            }
        });

        if (!companyPlan || !companyPlan.plan) {
            console.timeEnd('🧩 Plano + Cache');
            throw new CompanyWithoutPlanError();
        }

        const plan = companyPlan.plan;

        const planDto: PlanDto = {
            id: plan.id,
            name: plan.name,
            description: plan.description ?? '',
            modules: plan.module.map(pm => ({
                module_key: pm.module.module_key,
                name: pm.module.name,
                description: pm.module.description ?? '',
                permission: Array.from(new Set(pm.permission)),
                isActive: true,
            })),
        };

        await this.redis.setex(cacheKey, 3600, JSON.stringify(planDto));
        console.log(`✅ Plano salvo no Redis: ${cacheKey} (TTL: 3600s)`);

        console.timeEnd('🧩 Plano + Cache');
        return planDto;
    }

    // ✅ 5. Montar UserDto
    private buildUserDto(user: Users, company: any, planDto: PlanDto): UserDto {
        console.time('📦 Montar UserDto');
        const userDto: UserDto = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
            createdAt: user.createdAt,
            company,
            plan: planDto,
            permissions: planDto.modules.map(m => ({
                module_key: m.module_key,
                permissions: m.permission,
            })),
        };
        console.timeEnd('📦 Montar UserDto');
        return userDto;
    }

    // ✅ 6. Gerar token JWT
    private _createToken(user: Users): { expiresIn: string; accessToken: string } {
        const payload: JwtPayload = {
            sub: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
        };
        return {
            accessToken: this.jwtService.sign(payload),
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
        };
    }

    async validateUser(payload: JwtPayload): Promise<any> {
        const user = await this.prisma.users.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                company_id: true,
                is_active: true,
            },
        });

        if (!user || !user.is_active) {
            throw new HttpException('INVALID_TOKEN', HttpStatus.UNAUTHORIZED);
        }
        return user;
    }
}

// ✅ Schema e DTO
export const LoginUserSchema = z.object({
    email: z.string().email('Email inválido'),
    password_hash: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export type LoginUserDto = z.infer<typeof LoginUserSchema>;
