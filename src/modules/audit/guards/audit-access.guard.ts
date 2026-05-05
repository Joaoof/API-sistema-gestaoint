import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuditAccessService } from '../use-cases/audit-access.service';

@Injectable()
export class AuditAccessGuard implements CanActivate {
  constructor(private readonly access: AuditAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;

    const headerToken =
      req?.headers?.['x-audit-token'] ?? req?.headers?.['X-Audit-Token'];

    const token = Array.isArray(headerToken) ? headerToken[0] : headerToken;
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException(
        'Acesso à auditoria requer reautenticação.',
      );
    }

    const payload = await this.access.verifyToken(token);

    const user = req?.user;
    if (!user || (user.id ?? user.sub) !== payload.sub) {
      throw new UnauthorizedException(
        'Token de auditoria não corresponde ao usuário autenticado.',
      );
    }

    return true;
  }
}
