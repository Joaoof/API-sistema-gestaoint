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

    async onModuleInit() {
        await this.preloadFrequentCompanies();
    }

    private async preloadFrequentCompanies() {
        try {
            const frequentCompanies = await this.prisma.company.findMany({
                where: { is_active: true },
                take: 20,
                select: { id: true }
            });

            await Promise.all(
                frequentCompanies.map(company =>
                    this.fetchCompany(company.id).catch(() => null)
                )
            );
        } catch (error) {
            console.log('⚠️  Pré-cache de empresas falhou, continuando...');
        }
    }

    async login(loginUserDto: LoginUserDto): Promise<any> {
        console.time('🔐 AuthService.login completo');

        // 1. Validação rápida
        const { email, password_hash } = this.validateInputQuick(loginUserDto);

        // 2. Buscar tudo de uma vez com cache
        const userWithData = await this.findUserWithCompanyAndPlan(email, password_hash);

        if (!userWithData) {
            console.timeEnd('🔐 AuthService.login completo');
            throw new InvalidCredentialsError();
        }

        // 3. Validar senha
        console.time('🔑 Validação de senha');
        const isValid = await argon2.verify(userWithData.password_hash, password_hash);
        if (!isValid) {
            console.timeEnd('🔑 Validação de senha');
            console.timeEnd('🔐 AuthService.login completo');
            throw new InvalidCredentialsError();
        }
        console.timeEnd('🔑 Validação de senha');

        // 4. Processar dados (já temos tudo)
        const company = userWithData.company;
        const planDto = this.processPlanFromCompany(company);

        if (!planDto) {
            console.timeEnd('🔐 AuthService.login completo');
            throw new CompanyWithoutPlanError();
        }

        // 5. Gerar token e resposta
        const token = this._createToken(userWithData);
        const userDto = this.buildUserDto(userWithData, company, planDto);

        // 6. Cache assíncrono (não bloqueia a resposta)
        this.cacheUserDataAsync(userWithData.id, company, planDto);

        console.timeEnd('🔐 AuthService.login completo');

        return {
            accessToken: token.accessToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
            user: userDto,
        };
    }

    private validateInputQuick(dto: LoginUserDto): LoginUserDto {
        console.time('⚡ Validação Rápida');

        if (!dto.email || !dto.email.includes('@')) {
            console.timeEnd('⚡ Validação Rápida');
            throw new DomainValidationError([{ field: 'email', message: 'Email inválido' }]);
        }

        if (!dto.password_hash || dto.password_hash.length < 8) {
            console.timeEnd('⚡ Validação Rápida');
            throw new DomainValidationError([{ field: 'password_hash', message: 'Senha deve ter pelo menos 8 caracteres' }]);
        }

        console.timeEnd('⚡ Validação Rápida');
        return dto;
    }

    private async findUserWithCompanyAndPlan(email: string, passwordInput: string) {
        console.time('🗄️ Busca Completa Usuário');

        const cacheKey = `auth:user:full:${email}`;

        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                console.log(`✅ CACHE HIT: Usuário completo ${email}`);
                console.timeEnd('🗄️ Busca Completa Usuário');
                return JSON.parse(cached);
            }
        } catch (err) {
            console.error('🔴 Redis user cache error:', err.message);
        }

        const user = await this.prisma.users.findUnique({
            where: { email },
            include: {
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
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (user) {
            try {
                await this.redis.setex(cacheKey, 300, JSON.stringify(user));
            } catch (err) {
                console.error('🔴 Redis set error:', err.message);
            }
        }

        console.timeEnd('🗄️ Busca Completa Usuário');
        return user;
    }

    private processPlanFromCompany(company: any): PlanDto | null {
        if (!company.companyPlan || company.companyPlan.length === 0) {
            return null;
        }

        const companyPlan = company.companyPlan;
        if (!companyPlan.plan) {
            return null;
        }

        const plan = companyPlan.plan;

        const planDto: PlanDto = {
            id: plan.id,
            name: plan.name,
            description: plan.description ?? '',
            modules: plan.plan_module.map(pm => ({
                module_key: pm.module.module_key,
                name: pm.module.name,
                description: pm.module.description ?? '',
                permission: pm.permission ? Array.from(new Set(pm.permission)) : [],
                isActive: true,
            })),
        };

        return planDto;
    }

    private async fetchCompany(companyId: string) {
        console.time('🏢 Busca Empresa');
        const cacheKey = `auth:company:basic:${companyId}`;

        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                console.log(`✅ CACHE HIT: Empresa ${companyId}`);
                console.timeEnd('🏢 Busca Empresa');
                return JSON.parse(cached);
            }
        } catch (err) {
            console.error(`🔴 Redis GET falhou:`, err.message);
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

        try {
            await this.redis.setex(cacheKey, 3600, JSON.stringify(company));
        } catch (err) {
            console.error(`🔴 Falha ao salvar empresa no Redis:`, err.message);
        }

        console.timeEnd('🏢 Busca Empresa');
        return company;
    }

    private async cacheUserDataAsync(userId: string, company: any, planDto: PlanDto) {
        Promise.all([
            this.redis.setex(`auth:company:basic:${company.id}`, 3600, JSON.stringify(company))
                .catch(err => console.error('Redis company error:', err)),
            this.redis.setex(`auth:company:plan:${company.id}`, 3600, JSON.stringify(planDto))
                .catch(err => console.error('Redis plan error:', err))
        ]).then(() => console.log('✅ Cache atualizado em background'));
    }

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
        const cacheKey = `auth:user:${payload.sub}`;

        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (err) {
            console.error('Redis user validation error:', err.message);
        }

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

        if (user && user.is_active) {
            try {
                await this.redis.setex(cacheKey, 600, JSON.stringify(user));
            } catch (err) {
                console.error('Redis set user error:', err.message);
            }
            return user;
        }

        throw new HttpException('INVALID_TOKEN', HttpStatus.UNAUTHORIZED);
    }
}

// ✅ Schema e DTO
export const LoginUserSchema = z.object({
    email: z.string().email('Email inválido'),
    password_hash: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export type LoginUserDto = z.infer<typeof LoginUserSchema>;