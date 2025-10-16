// src/infra/graphql/resolvers/user.resolver.ts
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { GqlAuthGuard } from 'src/auth/guards/auth.guard';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UserResponseDto } from 'src/core/use-cases/create-user.core-dto';
import { ChangePasswordInput } from '../../../core/use-cases/cashMovement/dtos/change-password.input';
import { ChangePasswordUseCase } from 'src/core/use-cases/users/change-password.use-case';

@Resolver(() => UserResponseDto)
export class UserResolver {
  private readonly prisma: PrismaService;
  private readonly changePasswordUseCase: ChangePasswordUseCase;
  constructor(prisma: PrismaService, changePasswordUseCase: ChangePasswordUseCase) {
    this.prisma = prisma;
    this.changePasswordUseCase = changePasswordUseCase;
  }

  @Query(() => UserResponseDto)
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() userPayload: any): Promise<UserResponseDto> {

    const userId = userPayload.id || userPayload.sub;
    console.log('ID buscado no DB:', userId); // Adicione esta linha
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
      modules: plan.module?.map((pm) => ({
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

  @Mutation(() => String) // Retorna uma string de sucesso
  @UseGuards(GqlAuthGuard)
  async changePassword(
    @Args('input') input: ChangePasswordInput,
    @CurrentUser() userPayload: any,
  ): Promise<string> {

    const userId = userPayload.id || userPayload.sub;

    if (input.newPassword !== input.confirmPassword) {
      throw new Error('A nova senha e a confirmação não coincidem.');
    }

    const result = await this.changePasswordUseCase.execute(userId, input);

    if (result === 'Usuário não encontrado') {
      throw new Error('Usuário autenticado não encontrado na base.');
    }

    return 'Senha alterada com sucesso! Você será desconectado em breve.';
  } catch(e: any) {
    throw new Error('Falha ao alterar senha. Verifique a senha atual ou tente novamente.');
  }
}

