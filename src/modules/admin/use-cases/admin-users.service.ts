import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { AuditAction } from '@prisma/client';
import {
  AdminCreateUserInput,
  AdminResetPasswordInput,
  AdminUpdateUserInput,
} from '../dto/admin.input';
import { AdminUserEntity } from '../entities/admin.entities';

function toEntity(raw: any): AdminUserEntity {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone ?? null,
    role: raw.role,
    is_active: raw.is_active,
    isSuperAdmin: raw.isSuperAdmin === true,
    company_id: raw.company_id ?? null,
    companyName: raw.company?.name ?? null,
    createdAt: raw.createdAt,
  };
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(search?: string): Promise<AdminUserEntity[]> {
    const rows = await this.prisma.users.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEntity);
  }

  async create(actor: AuditActor, input: AdminCreateUserInput): Promise<AdminUserEntity> {
    const exists = await this.prisma.users.findUnique({ where: { email: input.email } });
    if (exists) throw new ConflictException('Já existe usuário com esse e-mail.');
    const company = await this.prisma.company.findUnique({ where: { id: input.company_id } });
    if (!company) throw new BadRequestException('Empresa não encontrada.');

    const hash = await argon2.hash(input.password);
    const created = await this.prisma.users.create({
      data: {
        name: input.name,
        email: input.email,
        password_hash: hash,
        role: input.role,
        company_id: input.company_id,
        phone: input.phone ?? null,
        is_active: true,
        isSuperAdmin: input.isSuperAdmin === true,
      } as any,
      include: { company: true },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Users',
      entityId: created.id,
      action: AuditAction.CREATE,
      after: { ...created, password_hash: '***' } as any,
      reason: 'Criação de usuário pelo super-admin.',
    });

    return toEntity(created);
  }

  async update(actor: AuditActor, input: AdminUpdateUserInput): Promise<AdminUserEntity> {
    const existing = await this.prisma.users.findUnique({
      where: { id: input.id },
      include: { company: true },
    });
    if (!existing) throw new NotFoundException('Usuário não encontrado.');

    if (input.email && input.email !== existing.email) {
      const taken = await this.prisma.users.findFirst({
        where: { email: input.email, NOT: { id: input.id } },
      });
      if (taken) throw new ConflictException('E-mail já em uso.');
    }

    const updated = await this.prisma.users.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.role !== undefined && { role: input.role }),
        ...(input.company_id !== undefined && { company_id: input.company_id }),
        ...(input.is_active !== undefined && { is_active: input.is_active }),
        ...(input.isSuperAdmin !== undefined && { isSuperAdmin: input.isSuperAdmin } as any),
      },
      include: { company: true },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Users',
      entityId: updated.id,
      action: AuditAction.UPDATE,
      before: { ...existing, password_hash: '***' } as any,
      after: { ...updated, password_hash: '***' } as any,
      reason: 'Edição pelo super-admin.',
    });

    return toEntity(updated);
  }

  async resetPassword(actor: AuditActor, input: AdminResetPasswordInput): Promise<boolean> {
    const existing = await this.prisma.users.findUnique({ where: { id: input.userId } });
    if (!existing) throw new NotFoundException('Usuário não encontrado.');

    const hash = await argon2.hash(input.newPassword);
    await this.prisma.users.update({
      where: { id: input.userId },
      data: { password_hash: hash },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Users',
      entityId: input.userId,
      action: AuditAction.UPDATE,
      reason: 'Senha redefinida pelo super-admin.',
    });

    return true;
  }

  async remove(actor: AuditActor, id: string): Promise<boolean> {
    if (id === actor.userId) {
      throw new BadRequestException('Não pode excluir a si mesmo.');
    }
    const existing = await this.prisma.users.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Usuário não encontrado.');

    // Soft delete: desativa em vez de apagar (preserva FKs e auditoria).
    await this.prisma.users.update({
      where: { id },
      data: { is_active: false },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Users',
      entityId: id,
      action: AuditAction.DELETE,
      before: { ...existing, password_hash: '***' } as any,
      reason: 'Desativação pelo super-admin.',
    });

    return true;
  }
}
