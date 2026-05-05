import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../../prisma/prisma.service';

const AUDIT_TOKEN_TTL_SECONDS = 15 * 60;

export interface AuditAccessTokenResult {
  token: string;
  expiresIn: number;
}

export interface AuditAccessPayload {
  sub: string;
  companyId: string;
  audit_access: true;
}

@Injectable()
export class AuditAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async issueToken(
    userId: string,
    companyId: string,
    password: string,
  ): Promise<AuditAccessTokenResult> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, password_hash: true, company_id: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    let valid = false;
    try {
      valid = await argon2.verify(user.password_hash, password);
    } catch {
      valid = false;
    }
    if (!valid) {
      throw new UnauthorizedException('Senha inválida.');
    }

    const payload: AuditAccessPayload = {
      sub: user.id,
      companyId: user.company_id ?? companyId,
      audit_access: true,
    };

    const token = await this.jwt.signAsync(payload, {
      expiresIn: AUDIT_TOKEN_TTL_SECONDS,
    });

    return { token, expiresIn: AUDIT_TOKEN_TTL_SECONDS };
  }

  async verifyToken(token: string): Promise<AuditAccessPayload> {
    try {
      const payload = await this.jwt.verifyAsync<AuditAccessPayload>(token);
      if (!payload?.audit_access) {
        throw new UnauthorizedException('Token de auditoria inválido.');
      }
      return payload;
    } catch {
      throw new UnauthorizedException(
        'Acesso à auditoria expirado ou inválido. Reautentique-se.',
      );
    }
  }
}
