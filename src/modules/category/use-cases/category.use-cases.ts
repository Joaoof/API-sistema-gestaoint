import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, CategoryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import {
  CategoryFiltersInput,
  CreateCategoryInput,
  PaginationInput,
  UpdateCategoryInput,
} from '../dto/category.input';
import {
  CategoryEntity,
  CategoryListEntity,
  DeleteCategoryResult,
} from '../entities/category.entity';

type RawCategory = Prisma.CategoryGetPayload<object>;

function toEntity(raw: RawCategory): CategoryEntity {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    color: raw.color,
    active: raw.status === CategoryStatus.ACTIVE,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

@Injectable()
export class CategoryUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(
    companyId: string,
    pagination?: PaginationInput,
    filters?: CategoryFiltersInput,
  ): Promise<CategoryListEntity> {
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {
      companyId,
      ...(filters?.search
        ? { name: { contains: filters.search, mode: 'insensitive' } }
        : {}),
      ...(filters?.active !== undefined
        ? {
            status: filters.active
              ? CategoryStatus.ACTIVE
              : CategoryStatus.INACTIVE,
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: rows.map(toEntity),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async listActive(companyId: string): Promise<CategoryEntity[]> {
    const rows = await this.prisma.category.findMany({
      where: { companyId, status: CategoryStatus.ACTIVE },
      orderBy: { name: 'asc' },
    });
    return rows.map(toEntity);
  }

  async findById(companyId: string, id: string): Promise<CategoryEntity> {
    const found = await this.prisma.category.findFirst({
      where: { id, companyId },
    });
    if (!found) throw new NotFoundException('Categoria não encontrada.');
    return toEntity(found);
  }

  async create(
    actor: AuditActor,
    input: CreateCategoryInput,
  ): Promise<CategoryEntity> {
    try {
      const created = await this.prisma.category.create({
        data: {
          companyId: actor.companyId,
          name: input.name,
          description: input.description ?? null,
          color: input.color,
          status: input.active ? CategoryStatus.ACTIVE : CategoryStatus.INACTIVE,
        },
      });
      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'Category',
        entityId: created.id,
        action: AuditAction.CREATE,
        after: created,
      });
      return toEntity(created);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Já existe uma categoria com esse nome.');
      }
      throw err;
    }
  }

  async update(
    actor: AuditActor,
    id: string,
    input: UpdateCategoryInput,
  ): Promise<CategoryEntity> {
    const existing = await this.prisma.category.findFirst({
      where: { id, companyId: actor.companyId },
    });
    if (!existing) throw new NotFoundException('Categoria não encontrada.');

    const data: Prisma.CategoryUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.color !== undefined) data.color = input.color;
    if (input.active !== undefined) {
      data.status = input.active
        ? CategoryStatus.ACTIVE
        : CategoryStatus.INACTIVE;
    }

    const updated = await this.prisma.category.update({ where: { id }, data });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Category',
      entityId: id,
      action: AuditAction.UPDATE,
      before: existing,
      after: updated,
    });
    return toEntity(updated);
  }

  async delete(
    actor: AuditActor,
    id: string,
  ): Promise<DeleteCategoryResult> {
    const existing = await this.prisma.category.findFirst({
      where: { id, companyId: actor.companyId },
    });
    if (!existing) {
      return { success: false, message: 'Categoria não encontrada.' };
    }
    const linked = await this.prisma.product.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (linked > 0) {
      return {
        success: false,
        message: `Existem ${linked} produto(s) vinculado(s) a esta categoria.`,
      };
    }
    await this.prisma.category.delete({ where: { id } });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Category',
      entityId: id,
      action: AuditAction.DELETE,
      before: existing,
    });
    return { success: true, message: 'Categoria excluída com sucesso.' };
  }

  async toggleStatus(
    actor: AuditActor,
    id: string,
  ): Promise<CategoryEntity> {
    const existing = await this.prisma.category.findFirst({
      where: { id, companyId: actor.companyId },
    });
    if (!existing) throw new NotFoundException('Categoria não encontrada.');
    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        status:
          existing.status === CategoryStatus.ACTIVE
            ? CategoryStatus.INACTIVE
            : CategoryStatus.ACTIVE,
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Category',
      entityId: id,
      action:
        updated.status === CategoryStatus.ACTIVE
          ? AuditAction.ACTIVATE
          : AuditAction.FREEZE,
      before: existing,
      after: updated,
    });
    return toEntity(updated);
  }
}
