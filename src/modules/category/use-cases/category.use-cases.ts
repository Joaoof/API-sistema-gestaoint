import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async list(
    pagination?: PaginationInput,
    filters?: CategoryFiltersInput,
  ): Promise<CategoryListEntity> {
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {
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

  async listActive(): Promise<CategoryEntity[]> {
    const rows = await this.prisma.category.findMany({
      where: { status: CategoryStatus.ACTIVE },
      orderBy: { name: 'asc' },
    });
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<CategoryEntity> {
    const found = await this.prisma.category.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Categoria não encontrada.');
    return toEntity(found);
  }

  async create(input: CreateCategoryInput): Promise<CategoryEntity> {
    try {
      const created = await this.prisma.category.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          color: input.color,
          status: input.active ? CategoryStatus.ACTIVE : CategoryStatus.INACTIVE,
        },
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
    id: string,
    input: UpdateCategoryInput,
  ): Promise<CategoryEntity> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
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
    return toEntity(updated);
  }

  async delete(id: string): Promise<DeleteCategoryResult> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
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
    return { success: true, message: 'Categoria excluída com sucesso.' };
  }

  async toggleStatus(id: string): Promise<CategoryEntity> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
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
    return toEntity(updated);
  }
}
