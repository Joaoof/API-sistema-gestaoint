import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthUser, getUserId } from './auth-user';

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

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
}
