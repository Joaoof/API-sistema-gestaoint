import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ListUsersInput, UserAdminDto } from '../dto/super-admin.dto';

@Injectable()
export class SuperAdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input?: ListUsersInput): Promise<UserAdminDto[]> {
    const where: any = {};
    if (input?.role) where.role = input.role;
    if (input?.companyId) where.company_id = input.companyId;
    if (input?.search) {
      where.OR = [
        { name: { contains: input.search, mode: 'insensitive' } },
        { email: { contains: input.search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.users.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: input?.take ?? 200,
      skip: input?.skip ?? 0,
      include: {
        company: {
          select: {
            id: true, name: true,
            companyPlan: { include: { plan: { select: { name: true } } } },
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.is_active,
      isSuperAdmin: u.isSuperAdmin,
      companyId: u.company_id,
      companyName: u.company?.name ?? null,
      plan: u.company?.companyPlan?.plan?.name ?? null,
      createdAt: u.createdAt,
    }));
  }

  async setActive(id: string, isActive: boolean) {
    return this.prisma.users.update({
      where: { id },
      data: { is_active: isActive },
    });
  }
}
