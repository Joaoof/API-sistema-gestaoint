import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { FeatureFlagService } from '../use-cases/feature-flag.service';
import { REQUIRES_MODULE_KEY } from './requires-module.decorator';

/**
 * Guard que valida se o módulo decorado em `@RequiresModule(...)` está
 * habilitado pra empresa do usuário logado.
 *
 * Importante: depende do `GqlAuthGuard` ter rodado antes pra hidratar
 * `req.user.company_id`. Super-admins passam sem checar (operam por cima).
 */
@Injectable()
export class RequiresModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlag: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRES_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    const user = req?.user;

    if (!user) throw new ForbiddenException('Sem usuário autenticado.');
    if (user.isSuperAdmin) return true;
    if (!user.company_id) {
      throw new ForbiddenException('Usuário sem empresa associada.');
    }

    const ok = await this.featureFlag.hasModule(user.company_id, required);
    if (!ok) {
      throw new ForbiddenException(
        `Módulo "${required}" não está habilitado para esta empresa.`,
      );
    }
    return true;
  }
}
