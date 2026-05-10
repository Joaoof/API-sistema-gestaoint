// src/infra/graphql/resolvers/user.resolver.ts
import { ConflictException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { GqlAuthGuard } from 'src/auth/guards/auth.guard';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UserResponseDto } from 'src/core/use-cases/create-user.core-dto';
import { ChangePasswordInput } from '../../../core/use-cases/cashMovement/dtos/change-password.input';
import { ChangePasswordUseCase } from 'src/core/use-cases/users/change-password.use-case';
import { UpdateProfileInput } from 'src/core/use-cases/users/dtos/update-profile.input';

@Resolver(() => UserResponseDto)
export class UserResolver {
  private readonly prisma: PrismaService;
  private readonly changePasswordUseCase: ChangePasswordUseCase;
  constructor(prisma: PrismaService, changePasswordUseCase: ChangePasswordUseCase) {
    this.prisma = prisma;
    this.changePasswordUseCase = changePasswordUseCase;
  }

  private async buildResponse(userId: string): Promise<UserResponseDto> {
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

    const permissions = plan.module.map((pm) => ({
      module_key: pm.module.module_key,
      permissions: pm.permission,
    }));

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

    const response = new UserResponseDto();
    response.id = user.id;
    response.name = user.name;
    response.email = user.email;
    response.phone = user.phone ?? undefined;
    response.avatarUrl = user.avatarUrl ?? undefined;
    response.role = user.role;
    response.company_id = user.company_id;
    response.is_active = user.is_active;
    response.isSuperAdmin = (user as any).isSuperAdmin === true;
    response.plan = planDto;
    response.permissions = permissions;

    return response;
  }

  @Query(() => UserResponseDto)
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() userPayload: any): Promise<UserResponseDto> {
    const userId = userPayload.id || userPayload.sub;
    return this.buildResponse(userId);
  }

  @Mutation(() => UserResponseDto)
  @UseGuards(GqlAuthGuard)
  async updateMyProfile(
    @Args('input') input: UpdateProfileInput,
    @CurrentUser() userPayload: any,
  ): Promise<UserResponseDto> {
    const userId = userPayload.id || userPayload.sub;

    if (input.email !== undefined) {
      const taken = await this.prisma.users.findFirst({
        where: { email: input.email, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) {
        throw new ConflictException('Este e-mail já está em uso por outro usuário.');
      }
    }

    await this.prisma.users.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      },
    });

    return this.buildResponse(userId);
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard)
  async changePassword(
    @Args('input') input: ChangePasswordInput,
    @CurrentUser() userPayload: any,
  ): Promise<string> {
    const userId = userPayload.id || userPayload.sub;

    if (input.newPassword !== input.confirmPassword) {
      throw new Error('A nova senha e a confirmação não coincidem.');
    }

    try {
      const result = await this.changePasswordUseCase.execute(userId, input);

      if (result === 'Usuário não encontrado') {
        throw new Error('Usuário autenticado não encontrado na base.');
      }

      return 'Senha alterada com sucesso! Você será desconectado em breve.';
    } catch (e: any) {
      throw new Error(
        e?.message ?? 'Falha ao alterar senha. Verifique a senha atual ou tente novamente.',
      );
    }
  }
}
