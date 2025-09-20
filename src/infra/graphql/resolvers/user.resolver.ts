// src/infra/graphql/resolvers/user.resolver.ts
import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { GqlAuthGuard } from 'src/auth/guards/auth.guard';
import { UserResponseDto } from 'src/modules/user/dtos/reponse-user.dto';
import { PrismaService } from 'prisma/prisma.service';

@Resolver(() => UserResponseDto)
export class UserResolver {
    constructor(private readonly prisma: PrismaService) { }

    @Query(() => UserResponseDto)
    @UseGuards(GqlAuthGuard)
    async me(@CurrentUser() userPayload: any): Promise<UserResponseDto> {
        // ✅ Use o ID do payload para buscar o usuário completo
        const user = await this.prisma.users.findUnique({
            where: { id: userPayload.id || userPayload.sub },
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
            throw new Error('Usuário não encontrado');
        }

        if (!user.company) {
            throw new Error('Usuário sem empresa vinculada');
        }

        const companyPlan = user.company.companyPlan;

        console.log('PLANO DA COMPANIA', companyPlan);
        
        if (!companyPlan?.plan) {
            throw new Error('Empresa sem plano ativo');
        }

        const plan = companyPlan.plan;


        // ✅ Monta permissions
        const permissions = plan.module.map((pm) => ({
            module_key: pm.module.module_key,
            permissions: pm.permission,
        }));

        // ✅ Monta planDto
        const planDto = {
            id: plan.id,
            name: plan.name ?? 'Sem nome',
            description: plan.description ?? '',
            modules: plan.module.map((pm) => ({
                module_key: pm.module.module_key,
                name: pm.module.name,
                description: pm.module.description ?? '',
                permission: pm.permission,
                isActive: pm.isActive,
            })),
        };

        // ✅ Monta o DTO final
        const response = new UserResponseDto();
        response.id = user.id;
        response.name = user.name;
        response.email = user.email;
        response.role = user.role;
        response.company_id = user.company_id;
        response.is_active = user.is_active;
        response.plan = planDto;
        response.permissions = permissions; // ✅ Nunca null

        return response;
    }
}