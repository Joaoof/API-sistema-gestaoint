import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.REPORTS_API_KEY;
    if (!expected) {
      throw new UnauthorizedException(
        'REPORTS_API_KEY não configurada no servidor.',
      );
    }
    const req = context.switchToHttp().getRequest<Request>();
    const provided =
      (req.headers['x-api-key'] as string | undefined) ??
      (req.headers['X-Api-Key'] as string | undefined);
    if (provided !== expected) {
      throw new UnauthorizedException('API key inválida.');
    }
    return true;
  }
}
