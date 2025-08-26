import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from 'src/auth/jwt.strategy';
import { PrismaService } from 'prisma/prisma.service';
import { Users } from "@prisma/client"; // ou do seu DTO, se for diferente
import { z } from "zod"
import * as argon2 from 'argon2';
import { ObjectType, Field } from '@nestjs/graphql';
import { PlanDto } from 'src/infra/graphql/dto/plan.dto';
import { CompanyDto } from 'src/infra/graphql/dto/company.dto';
import { UnauthorizedError } from 'src/core/exceptions/api.exception';
import { ForbiddenError } from '@nestjs/apollo';
import { InvalidCredentialsError } from 'src/core/exceptions/invalid-credentials.exception';
import { CompanyWithoutPlanError } from 'src/core/exceptions/company-without-plan.exception';
import { DomainValidationError } from 'src/core/exceptions/domain.exception';
import { UserDto } from 'src/infra/graphql/dto/user.dto';

type UserPayload = {
    id: string;
    name: string;
    email: string;
    role: string;
    company_id: string;
};

export const LoginUserSchema = z.object({
    email: z.string().email("Email inválido"),
    password_hash: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
})

export type LoginUserDto = z.infer<typeof LoginUserSchema>

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    private async validatePassword(hashedPassword: string, password_hash: string): Promise<boolean> {
        console.time('argon2-verify');
        return argon2.verify(hashedPassword, password_hash);
        console.time('argon2-verify');

    }
    async login(loginUserDto: LoginUserDto): Promise<any> {
        const { email, password_hash } = loginUserDto;
        const parsed = LoginUserSchema.safeParse(loginUserDto);
        if (!parsed.success) {
            const validationErrors = parsed.error.errors.map(err => ({
                field: err.path.join('.'), // ex: "email" ou "password_hash"
                message: err.message,
            }));

            throw new DomainValidationError(validationErrors); // ✅
        }

        const user = await this.prisma.users.findUnique({
            where: { email },
            include: {
                company: {
                    include: {
                        companyPlan: {
                            where: { isActive: true },
                            include: {
                                plan: {
                                    include: {
                                        module: {
                                            where: { isActive: true },
                                            include: {
                                                module: true,
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
            throw new InvalidCredentialsError();
        }
        if (!user.company) throw new ForbiddenError("Usuário sem empresa vinculada");


        const validPassword = await this.validatePassword(user.password_hash, password_hash);

        if (!validPassword) {
            throw new InvalidCredentialsError();
        }


        const companyPlan = user.company.companyPlan;
        if (!companyPlan?.plan) {
            throw new CompanyWithoutPlanError();
        }

        const plan = companyPlan.plan;

        const permissions = plan.module.map(pm => ({
            module_key: pm.module.module_key,
            permissions: pm.permission, // ex: ['READ', 'WRITE']
        }));

        const moduleMap = new Map<string, typeof modulesDto[0]>();
        for (const pm of plan.module) {
            const key = pm.module.module_key;

            if (!moduleMap.has(key)) {
                moduleMap.set(key, {
                    module_key: key,
                    name: pm.module.name,
                    description: pm.module.description ?? undefined,
                    permission: [...pm.permission],
                    isActive: pm.isActive,
                });
            } else {
                const existing = moduleMap.get(key)!;
                existing.permission = Array.from(new Set([...existing.permission, ...pm.permission]));
            }
        }

        const modulesDto = Array.from(moduleMap.values());


        const planDto: PlanDto = {
            id: plan.id,
            name: plan.name,
            description: plan.description ?? '',
            modules: modulesDto,
        };

        const token = this._createToken(user);

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
                logoUrl: user.company.logoUrl ?? ''
            },
            plan: planDto,
            permissions
        };

        return {
            accessToken: token.accessToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
            user: userDto
        };
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

    async validateUser(payload: JwtPayload): Promise<UserPayload> {
        const user = await this.prisma.users.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                company_id: true,
                createdAt: true,
                is_active: true,
            },
        });
        console.log(user);


        if (!user) {
            throw new HttpException("INVALID_TOKEN", HttpStatus.UNAUTHORIZED);
        }

        return user;
    }
}

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
