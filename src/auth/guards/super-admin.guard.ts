import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Bloqueia tudo exceto super-admins.
 *
 * Use sempre com `@UseGuards(GqlAuthGuard, SuperAdminGuard)` — o
 * `GqlAuthGuard` precisa rodar primeiro pra hidratar `req.user`.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    if (req?.user?.isSuperAdmin === true) return true;
    throw new ForbiddenException('Apenas super-admins podem executar isso.');
  }
}
