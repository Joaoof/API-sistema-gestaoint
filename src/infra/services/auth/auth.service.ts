import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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

// 🔁 Importe o Redis (certifique-se de injetar ou acessar via módulo)
@Injectable()
export class AuthService {
    private redis: Redis; // Injete via construtor ou use um RedisService

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) {
        // Acesse o Redis singleton (ajuste conforme sua configuração)
        this.redis = require('../infra/cache/redis'); // ou use injeção de dependência
    }

    async login(loginUserDto: LoginUserDto): Promise<any> {
        console.time('🔐 AuthService.login completo');

        const { email, password_hash } = loginUserDto;

        // 1️⃣ Validação Zod
        console.time('📝 Validação Zod');
        const parsed = LoginUserSchema.safeParse(loginUserDto);
        if (!parsed.success) {
            const validationErrors = parsed.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            console.timeEnd('📝 Validação Zod');
            console.timeEnd('🔐 AuthService.login completo');
            throw new DomainValidationError(validationErrors);
        }
        console.timeEnd('📝 Validação Zod');

        // 2️⃣ Busca no banco
        console.time('🗄️ Busca no banco (Prisma)');
        const user = await this.prisma.users.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                company_id: true,
                password_hash: true,
                createdAt: true,
                is_active: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        address: true,
                        logoUrl: true,
                        companyPlan: {
                            where: { isActive: true },
                            select: {
                                plan: {
                                    select: {
                                        id: true,
                                        name: true,
                                        description: true,
                                        module: {
                                            where: { isActive: true },
                                            select: {
                                                permission: true,
                                                module: {
                                                    select: {
                                                        module_key: true,
                                                        name: true,
                                                        description: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            console.timeEnd('🗄️ Busca no banco (Prisma)');
            console.timeEnd('🔐 AuthService.login completo');
            throw new InvalidCredentialsError();
        }

        if (!user.company) {
            console.timeEnd('🗄️ Busca no banco (Prisma)');
            console.timeEnd('🔐 AuthService.login completo');
            throw new HttpException('Usuário sem empresa vinculada', HttpStatus.FORBIDDEN);
        }
        console.timeEnd('🗄️ Busca no banco (Prisma)');

        // 3️⃣ Validação de senha
        console.time('🔑 Validação de senha (argon2)');
        const validPassword = await this.validatePassword(user.password_hash, password_hash);
        if (!validPassword) {
            console.timeEnd('🔑 Validação de senha (argon2)');
            console.timeEnd('🔐 AuthService.login completo');
            throw new InvalidCredentialsError();
        }
        console.timeEnd('🔑 Validação de senha (argon2)');

        // 4️⃣ Cache do plano da empresa
        console.time('🧩 Busca/Cache do plano');
        const cacheKey = `auth:company:plan:${user.company_id}`;
        let planDto: PlanDto;

        const cached = await this.redis.get(cacheKey);
        if (cached) {
            console.log('🎯 Plano carregado do cache Redis');
            planDto = JSON.parse(cached);
        } else {
            console.log('💾 Plano não encontrado no cache, buscando no banco');
            const companyPlan = user.company.companyPlan;
            if (!companyPlan) {
                console.timeEnd('🧩 Busca/Cache do plano');
                console.timeEnd('🔐 AuthService.login completo');
                throw new CompanyWithoutPlanError();
            }

            // Simplifique: não use Map se não for necessário
            const modulesDto = companyPlan.plan.module.map(pm => ({
                module_key: pm.module.module_key,
                name: pm.module.name,
                description: pm.module.description ?? undefined,
                permission: Array.from(new Set(pm.permission)), // remove duplicados
                isActive: true,
            }));

            planDto = {
                id: companyPlan.plan.id,
                name: companyPlan.plan.name,
                description: companyPlan.plan.description ?? '',
                modules: modulesDto,
            };

            // Cache por 1 hora
            await this.redis.setex(cacheKey, 3600, JSON.stringify(planDto));
        }
        console.timeEnd('🧩 Busca/Cache do plano');

        // 5️⃣ Geração de token
        console.time('⚡ Geração de token JWT');
        const token = this._createToken(user);
        console.timeEnd('⚡ Geração de token JWT');

        // 6️⃣ Montagem da resposta
        console.time('📦 Montagem do UserDto');
        const userDto: UserDto = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
            createdAt: user.createdAt,
            company: {
                id: user.company.id,
                name: user.company.name,
                email: user.company.email ?? '',
                phone: user.company.phone ?? '',
                address: user.company.address ?? '',
                logoUrl: user.company.logoUrl ?? '',
            },
            plan: planDto,
            permissions: planDto.modules.map(m => ({
                module_key: m.module_key,
                permissions: m.permission,
            })),
        };
        console.timeEnd('📦 Montagem do UserDto');

        console.timeEnd('🔐 AuthService.login completo');

        return {
            accessToken: token.accessToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
            user: userDto,
        };
    }

    private async validatePassword(hashedPassword: string, password_hash: string): Promise<boolean> {
        return argon2.verify(hashedPassword, password_hash);
    }

    private _createToken(user: Users): { expiresIn: string; accessToken: string } {
        const payload: JwtPayload = {
            sub: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
        };

        const accessToken = this.jwtService.sign(payload);
        return {
            expiresIn: process.env.EXPIRESIN || '3600s',
            accessToken,
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

// ✅ Schema de validação (mantido)
export const LoginUserSchema = z.object({
    email: z.string().email('Email inválido'),
    password_hash: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export type LoginUserDto = z.infer<typeof LoginUserSchema>;

// ✅ Interfaces (mantidas)
export interface RegistrationStatus {
    success: boolean;
    message: string;
    data?: Users;
}

export interface RegistrationSeederStatus {
    success: boolean;
    message: string;
    data?: UserDto;
}