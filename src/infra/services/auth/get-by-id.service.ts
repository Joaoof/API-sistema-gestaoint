import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { UserDto } from "src/infra/graphql/dto/user.dto";
import { UserResponseDto } from "src/modules/user/dtos/reponse-user.dto";

@Injectable()
export class GetByIdUserService {
    constructor(private readonly prisma: PrismaService) { }

    async getUserById(userId: string): Promise<UserResponseDto> {

        const user = await this.prisma.users.findUnique({
            where: { id: userId },
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
            name: plan.name,
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
