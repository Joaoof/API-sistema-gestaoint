import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, FinancialAccountType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import {
  CreateFinancialAccountInput,
  FinancialAccountFilterInput,
  UpdateFinancialAccountInput,
} from '../dto/financial-account.input';
import {
  FinancialAccountEntity,
  FinancialAccountTreeNode,
} from '../entities/financial-account.entity';

type RawAccount = Prisma.FinancialAccountGetPayload<{}>;

function toEntity(raw: RawAccount): FinancialAccountEntity {
  return {
    id: raw.id,
    companyId: raw.companyId,
    code: raw.code,
    name: raw.name,
    type: raw.type,
    parentId: raw.parentId,
    active: raw.active,
    description: raw.description,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

@Injectable()
export class FinancialAccountUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(
    companyId: string,
    filter: FinancialAccountFilterInput = {},
  ): Promise<FinancialAccountEntity[]> {
    const where: Prisma.FinancialAccountWhereInput = {
      companyId,
      ...(filter.activeOnly ? { active: true } : {}),
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { code: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.financialAccount.findMany({
      where,
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
      take: 1000,
    });
    return rows.map(toEntity);
  }

  async tree(
    companyId: string,
    filter: FinancialAccountFilterInput = {},
  ): Promise<FinancialAccountTreeNode[]> {
    const flat = await this.list(companyId, filter);
    const byParent = new Map<string | null, FinancialAccountEntity[]>();
    for (const acc of flat) {
      const arr = byParent.get(acc.parentId ?? null) ?? [];
      arr.push(acc);
      byParent.set(acc.parentId ?? null, arr);
    }
    const build = (parentId: string | null): FinancialAccountTreeNode[] => {
      const items = byParent.get(parentId) ?? [];
      return items.map((account) => ({
        account,
        children: build(account.id),
      }));
    };
    return build(null);
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<FinancialAccountEntity> {
    const acc = await this.prisma.financialAccount.findUnique({ where: { id } });
    if (!acc || acc.companyId !== companyId) {
      throw new NotFoundException('Conta não encontrada.');
    }
    return toEntity(acc);
  }

  async create(
    actor: AuditActor,
    input: CreateFinancialAccountInput,
  ): Promise<FinancialAccountEntity> {
    if (input.parentId) {
      const parent = await this.prisma.financialAccount.findUnique({
        where: { id: input.parentId },
      });
      if (!parent || parent.companyId !== actor.companyId) {
        throw new BadRequestException('Conta pai inválida.');
      }
      if (parent.type !== input.type) {
        throw new BadRequestException(
          'A conta filha deve ter o mesmo tipo da conta pai.',
        );
      }
    }

    try {
      const created = await this.prisma.financialAccount.create({
        data: {
          companyId: actor.companyId,
          code: input.code.trim(),
          name: input.name.trim(),
          type: input.type,
          parentId: input.parentId ?? null,
          active: input.active,
          description: input.description ?? null,
        },
      });

      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'FinancialAccount',
        entityId: created.id,
        action: AuditAction.CREATE,
        after: created,
      });

      return toEntity(created);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe uma conta com este código nesta empresa.',
        );
      }
      throw err;
    }
  }

  async update(
    actor: AuditActor,
    id: string,
    input: UpdateFinancialAccountInput,
  ): Promise<FinancialAccountEntity> {
    const existing = await this.prisma.financialAccount.findUnique({
      where: { id },
    });
    if (!existing || existing.companyId !== actor.companyId) {
      throw new NotFoundException('Conta não encontrada.');
    }

    if (input.parentId && input.parentId !== existing.parentId) {
      if (input.parentId === id) {
        throw new BadRequestException('Uma conta não pode ser pai de si mesma.');
      }
      const parent = await this.prisma.financialAccount.findUnique({
        where: { id: input.parentId },
      });
      if (!parent || parent.companyId !== actor.companyId) {
        throw new BadRequestException('Conta pai inválida.');
      }
      const targetType = input.type ?? existing.type;
      if (parent.type !== targetType) {
        throw new BadRequestException(
          'A conta filha deve ter o mesmo tipo da conta pai.',
        );
      }
    }

    if (input.type && input.type !== existing.type) {
      const childCount = await this.prisma.financialAccount.count({
        where: { parentId: id },
      });
      if (childCount > 0) {
        throw new BadRequestException(
          'Não é possível alterar o tipo de uma conta com filhos.',
        );
      }
    }

    try {
      const updated = await this.prisma.financialAccount.update({
        where: { id },
        data: {
          ...(input.code !== undefined ? { code: input.code.trim() } : {}),
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
        },
      });

      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'FinancialAccount',
        entityId: id,
        action: AuditAction.UPDATE,
        before: existing,
        after: updated,
      });

      return toEntity(updated);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe uma conta com este código nesta empresa.',
        );
      }
      throw err;
    }
  }

  async remove(actor: AuditActor, id: string): Promise<boolean> {
    const existing = await this.prisma.financialAccount.findUnique({
      where: { id },
    });
    if (!existing || existing.companyId !== actor.companyId) {
      throw new NotFoundException('Conta não encontrada.');
    }

    const childCount = await this.prisma.financialAccount.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        'Conta possui contas filhas; remova-as antes ou inative.',
      );
    }

    await this.prisma.financialAccount.delete({ where: { id } });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'FinancialAccount',
      entityId: id,
      action: AuditAction.DELETE,
      before: existing,
    });
    return true;
  }

  async seedDefaults(actor: AuditActor): Promise<FinancialAccountEntity[]> {
    const existingCount = await this.prisma.financialAccount.count({
      where: { companyId: actor.companyId },
    });
    if (existingCount > 0) {
      return this.list(actor.companyId);
    }

    const defaults: Array<{
      code: string;
      name: string;
      type: FinancialAccountType;
    }> = [
      { code: '1', name: 'Receitas', type: FinancialAccountType.INCOME },
      { code: '1.01', name: 'Vendas', type: FinancialAccountType.INCOME },
      { code: '1.02', name: 'Serviços', type: FinancialAccountType.INCOME },
      { code: '1.03', name: 'Outras receitas', type: FinancialAccountType.INCOME },
      { code: '2', name: 'Despesas', type: FinancialAccountType.EXPENSE },
      { code: '2.01', name: 'Folha de pagamento', type: FinancialAccountType.EXPENSE },
      { code: '2.02', name: 'Aluguel', type: FinancialAccountType.EXPENSE },
      { code: '2.03', name: 'Energia', type: FinancialAccountType.EXPENSE },
      { code: '2.04', name: 'Internet/Telefonia', type: FinancialAccountType.EXPENSE },
      { code: '2.05', name: 'Materiais', type: FinancialAccountType.EXPENSE },
      { code: '2.06', name: 'Impostos', type: FinancialAccountType.EXPENSE },
      { code: '2.07', name: 'Combustível', type: FinancialAccountType.EXPENSE },
      { code: '2.99', name: 'Outras despesas', type: FinancialAccountType.EXPENSE },
    ];

    const idByCode = new Map<string, string>();
    for (const d of defaults) {
      const parentCode = d.code.includes('.')
        ? d.code.substring(0, d.code.lastIndexOf('.'))
        : null;
      const parentId = parentCode ? idByCode.get(parentCode) ?? null : null;
      const created = await this.prisma.financialAccount.create({
        data: {
          companyId: actor.companyId,
          code: d.code,
          name: d.name,
          type: d.type,
          parentId,
          active: true,
        },
      });
      idByCode.set(d.code, created.id);
      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'FinancialAccount',
        entityId: created.id,
        action: AuditAction.CREATE,
        after: created,
        reason: 'Plano de contas inicial (seed).',
      });
    }
    return this.list(actor.companyId);
  }
}
