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

@ObjectType()
export class UserDto {
    @Field(() => String)
    id: string;

    @Field(() => String)
    email: string;

    @Field(() => String, { nullable: true })
    name?: string;

    @Field(() => String)
    company_id?: string

    @Field(() => String)
    role: string;

    @Field(() => CompanyDto)
    company: CompanyDto;

    @Field(() => PlanDto, { nullable: true })
    plan?: PlanDto;

    @Field(() => Date)
    createdAt: Date;
}

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
        return argon2.verify(hashedPassword, password_hash);
    }
    async login(loginUserDto: LoginUserDto): Promise<any> {
        const { email, password_hash } = loginUserDto;
        const parsed = LoginUserSchema.safeParse(loginUserDto);
        if (!parsed.success) {
            throw new HttpException(
                parsed.error.errors,
                HttpStatus.BAD_REQUEST
            );
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

        console.log(user);


        if (!user) {
            throw new HttpException("Usuário não encontrado", HttpStatus.UNAUTHORIZED);
        }

        if (!this.validatePassword(user.password_hash, password_hash)) {
            throw new HttpException("Credenciais inválidas", HttpStatus.UNAUTHORIZED);
        }

        if (!user.company) {
            throw new HttpException('Usuário sem empresa vinculada', HttpStatus.FORBIDDEN);
        }

        const companyPlan = user.company.companyPlan;
        console.log(companyPlan);

        if (!companyPlan?.plan) {
            throw new HttpException('Empresa sem plano ativo', HttpStatus.FORBIDDEN);
        }

        const plan = companyPlan.plan;

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
            createdAt: user.createdAt,
            company: {
                id: user.company.id,
                name: user.company.name,
                email: user.company.email ?? '',
                phone: user.company.phone ?? '',
                address: user.company.address ?? '',
            },
            plan: planDto,
        };


        return {
            accessToken: token.Authorization,
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
            user: userDto
        };
    }

    private _createToken(user: Users): { expiresIn: string; Authorization: string } {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
        };

        const Authorization = this.jwtService.sign(payload);

        return {
            expiresIn: process.env.EXPIRESIN || '3600s',
            Authorization,
        };
    }

    async validateUser(payload: JwtPayload): Promise<Users> {
        const user = await this.prisma.users.findUnique({
            where: { id: payload.sub },
        });

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
