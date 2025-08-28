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

    // Helper simples pra logar timings (sem warnings de label)
    private time(label: string) {
        return { label, start: Date.now() };
    }
    private timeEnd(timer: { label: string; start: number }) {
        const diff = Date.now() - timer.start;
        console.log(`${timer.label}: ${diff.toFixed(2)}ms`);
        return diff;
    }

    private async validatePassword(hashedPassword: string, password_hash: string): Promise<boolean> {
        const t = this.time('🔑 Validação de senha');
        const isValid = await argon2.verify(hashedPassword, password_hash);
        this.timeEnd(t);
        return isValid;
    }

    async login(loginUserDto: LoginUserDto): Promise<any> {
        const tTotal = this.time('🔐 AuthService.login completo (total)');

        // 1. Validar entrada
        const tValidate = this.time('📝 Validação Zod');
        const { email, password_hash } = await this.validateInput(loginUserDto);
        this.timeEnd(tValidate);

        // 2. Buscar e validar usuário
        const tUser = this.time('🗄️ Busca Usuário + Validação');
        const user = await this.findAndValidateUser(email, password_hash);
        this.timeEnd(tUser);

        // 3. Buscar empresa e plano em paralelo (operação independente)
        const tParallel = this.time('🔀 Paralelo: busca empresa + plano');
        const [company, planDto] = await Promise.all([
            this.fetchCompany(user.company_id),
            this.fetchPlanWithCache(user.company_id),
        ]);
        this.timeEnd(tParallel);

        // 4. Gerar token (medir separadamente)
        const tJwt = this.time('🔒 JWT sign');
        const token = this._createToken(user);
        this.timeEnd(tJwt);

        // 5. Montar resposta
        const tDto = this.time('📦 Montar UserDto');
        const userDto = this.buildUserDto(user, company, planDto);
        this.timeEnd(tDto);

        // medir serialização/return (caso GraphQL/Nest faça algo custoso)
        const tReturn = this.time('🚀 Serialização/Return');
        const response = {
            accessToken: token.accessToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
            user: userDto,
        };
        this.timeEnd(tReturn);

        this.timeEnd(tTotal);
        return response;
    }

    // 1. Validação de entrada
    private async validateInput(dto: LoginUserDto): Promise<LoginUserDto> {
        const t = this.time('📝 Validação Zod (interno)');
        const result = LoginUserSchema.safeParse(dto);
        if (!result.success) {
            const errors = result.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            this.timeEnd(t);
            throw new DomainValidationError(errors);
        }
        this.timeEnd(t);
        return result.data;
    }

    // 2. Buscar usuário + validar credenciais
    private async findAndValidateUser(email: string, passwordInput: string): Promise<Users> {
        const tFind = this.time('🗄️ Prisma.findUnique user');
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
        this.timeEnd(tFind);

        if (!user) {
            throw new InvalidCredentialsError();
        }

        const validPassword = await this.validatePassword(user.password_hash, passwordInput);

        if (!validPassword) {
            throw new InvalidCredentialsError();
        }
        return user;
    }

    // 3. Buscar empresa
    private async fetchCompany(companyId: string) {
        const t = this.time('🏢 Busca Empresa (cache+db)');
        const cacheKey = `auth:company:basic:${companyId}`;

        const tRedisGet = this.time('🏷️ Redis GET (company)');
        const cached = await this.redis.get(cacheKey);
        this.timeEnd(tRedisGet);

        if (cached) {
            console.log(`✅ CACHE HIT: Company ${companyId}`);
            this.timeEnd(t);
            return JSON.parse(cached);
        }

        const tDb = this.time('🏢 Prisma.findUnique company (db)');
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
        this.timeEnd(tDb);

        if (!company) {
            throw new HttpException('Empresa não encontrada', HttpStatus.FORBIDDEN);
        }

        const tRedisSet = this.time('🏷️ Redis SETEX (company)');
        await this.redis.setex(cacheKey, 3600, JSON.stringify(company));
        this.timeEnd(tRedisSet);
        console.log(`✅ Empresa ${companyId} salva no cache`);

        this.timeEnd(t);
        return company;
    }

    // 4. Buscar plano com cache (Redis)
    private async fetchPlanWithCache(companyId: string): Promise<PlanDto> {
        const t = this.time('🧩 Plano + Cache (total)');
        const cacheKey = `auth:company:plan:${companyId}`;

        const tRedisGet = this.time('🏷️ Redis GET (plan)');
        const cached = await this.redis.get(cacheKey);
        this.timeEnd(tRedisGet);

        if (cached) {
            console.log(`✅ CACHE HIT: Plano carregado do Redis para empresa ${companyId}`);
            this.timeEnd(t);
            return JSON.parse(cached);
        }

        console.log(`❌ CACHE MISS: Buscando plano no banco para empresa ${companyId}`);

        const tDb = this.time('🧩 Prisma.findFirst companyPlan (db)');
        const companyPlan = await this.prisma.companyPlan.findFirst({
            where: {
                company_id: companyId,
                isActive: true,
            },
            include: {
                plan: {
                    include: {
                        module: {
                            where: {
                                isActive: true,
                            },
                            include: {
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
        });
        this.timeEnd(tDb);

        if (!companyPlan || !companyPlan.plan) {
            this.timeEnd(t);
            throw new CompanyWithoutPlanError();
        }

        const plan = companyPlan.plan;

        const planDto: PlanDto = {
            id: plan.id,
            name: plan.name,
            description: plan.description ?? '',
            modules: plan.module.map((pm) => ({
                module_key: pm.module.module_key,
                name: pm.module.name,
                description: pm.module.description ?? '',
                permission: Array.from(new Set(pm.permission)),
                isActive: true,
            })),
        };

        const tRedisSet = this.time('🏷️ Redis SETEX (plan)');
        await this.redis.setex(cacheKey, 3600, JSON.stringify(planDto));
        this.timeEnd(tRedisSet);
        console.log(`✅ Plano salvo no Redis: ${cacheKey} (TTL: 3600s)`);

        this.timeEnd(t);
        return planDto;
    }

    // 5. Montar UserDto
    private buildUserDto(user: Users, company: any, planDto: PlanDto): UserDto {
        const t = this.time('📦 Montar UserDto');
        const userDto: UserDto = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
            createdAt: user.createdAt,
            company,
            plan: planDto,
            permissions: planDto.modules.map((m) => ({
                module_key: m.module_key,
                permissions: m.permission,
            })),
        };
        this.timeEnd(t);
        return userDto;
    }

    // 6. Gerar token JWT (sincrono)
    private _createToken(user: Users): { expiresIn: string; accessToken: string } {
        // jwtService.sign é síncrono por padrão (dependendo da lib/config).
        const payload: JwtPayload = {
            sub: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
        };
        const accessToken = this.jwtService.sign(payload);
        return {
            accessToken,
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

// Schema e DTO
export const LoginUserSchema = z.object({
    email: z.string().email('Email inválido'),
    password_hash: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export type LoginUserDto = z.infer<typeof LoginUserSchema>;
