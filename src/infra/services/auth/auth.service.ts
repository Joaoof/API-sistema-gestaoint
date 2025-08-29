import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/auth/jwt.strategy';
import { PrismaService } from 'prisma/prisma.service';
import { Users } from '@prisma/client';
import { z } from 'zod';
import { CompanyWithoutPlanError } from 'src/core/exceptions/company-without-plan.exception';
import { UserDto } from 'src/infra/graphql/dto/user.dto';
import { PlanDto } from 'src/infra/graphql/dto/plan.dto';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from 'src/infra/cache/redis.constants';
import { ValidateInputZod } from './validate-zod.service';
import { FindValidateUser } from './find-validate.service';
import { GetCompanyService } from './get-company.service';
import { GetPlanService } from './get-plan.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly validateInputZod: ValidateInputZod,
        private readonly findAndValidateUser: FindValidateUser,
        private readonly fetchCompany: GetCompanyService,
        private readonly fetchPlan: GetPlanService,
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

    async login(loginUserDto: LoginUserDto): Promise<any> {
        const { email, password_hash } = await this.validateInputZod.isValid(loginUserDto);
        const user = await this.findAndValidateUser.isValid(email, password_hash);
        console.log('✅ Usuário validado:', user);


        const [company, planDto] = await Promise.all([
            this.fetchCompany.getCompanyById(user.company_id ?? ''),
            this.fetchPlan.getPlanByCompanyId(user.company_id ?? ''),
        ]);

        // 4. Gerar token (medir separadamente)
        const tJwt = this.time('🔒 JWT sign');
        const token = this._createToken({
            id: user.id,
            name: user.name ?? '',
            email: user.email ?? '',
            role: user.role ?? '',
            company_id: user.company_id ?? '',
            createdAt: user.created_at ?? new Date(),
            is_active: user.is_active ?? true,
            password_hash: user.password_hash ?? '',

        });
        this.timeEnd(tJwt);

        // 5. Montar resposta
        const tDto = this.time('📦 Montar UserDto');
        const userDto = this.buildUserDto({
            id: user.id,
            name: user.name ?? '',
            email: user.email ?? '',
            role: user.role ?? '',
            company_id: user.company_id ?? '',
            createdAt: user.created_at ?? new Date(),
            is_active: user.is_active ?? true,
            password_hash: user.password_hash ?? '',
        }, company, planDto);
        this.timeEnd(tDto);

        // medir serialização/return (caso GraphQL/Nest faça algo custoso)
        const tReturn = this.time('🚀 Serialização/Return');
        const response = {
            accessToken: (await token).accessToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
            user: userDto,
        };
        this.timeEnd(tReturn);

        return response;
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
            createdAt: user.createdAt, // Use created_at from Users type
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
    private async _createToken(user: Users): Promise<{ expiresIn: string; accessToken: string; }> {
        // jwtService.sign é síncrono por padrão (dependendo da lib/config).
        const payload: JwtPayload = {
            sub: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
        };

        console.log('Payload do JWT:', payload);

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('❌ JWT_SECRET não está definido!');
            throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const accessToken = await this.jwtService.sign(payload);

        console.log('Access Token gerado:', accessToken);

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
