import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthUser, getUserId } from './auth-user';

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve o companyId do usuário autenticado. Joga 401 se anônimo, 403 se
   * usuário não tem empresa vinculada. NUNCA retorna vazio.
   */
  async resolveCompanyId(user?: AuthUser): Promise<string> {
    if (user?.companyId) return user.companyId;
    if (user?.company_id) return user.company_id;
    const userId = getUserId(user);
    if (!userId) throw new UnauthorizedException('Usuário não autenticado.');
    const u = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });
    if (!u?.company_id) throw new ForbiddenException('Empresa não vinculada ao usuário.');
    return u.company_id;
  }

  /**
   * Retorna o trecho de `where` Prisma pra filtrar por empresa.
   *
   * - Usuário normal: `{ companyId: 'xxx' }`
   * - Super-admin: `{}` (vê tudo)
   *
   * Uso:
   *   const where = await this.tenancy.tenantScope(user);
   *   return this.prisma.product.findMany({ where: { ...where, deletedAt: null } });
   */
  async tenantScope(user?: AuthUser): Promise<{ companyId?: string }> {
    if ((user as any)?.isSuperAdmin === true) return {};
    const companyId = await this.resolveCompanyId(user);
    return { companyId };
  }

  /**
   * Defesa contra IDOR: garante que o registro pertence ao tenant do usuário
   * antes de update/delete. Super-admin passa direto.
   *
   * Joga NotFoundException (não ForbiddenException) por princípio de não vazar
   * existência de dados de outro tenant.
   */
  assertOwnsOrThrow(record: { companyId?: string | null } | null, user: AuthUser): void {
    if (!record) {
      throw new NotFoundException('Registro não encontrado.');
    }
    if ((user as any)?.isSuperAdmin === true) return;
    const userCompanyId = user.companyId ?? user.company_id;
    if (record.companyId && userCompanyId && record.companyId !== userCompanyId) {
      throw new NotFoundException('Registro não encontrado.');
    }
  }
}
