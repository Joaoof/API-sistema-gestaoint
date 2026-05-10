import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface ExportTemplateInput {
  name: string;
  module: string;
  format: 'CSV' | 'XLSX' | 'PDF';
  filters: Record<string, unknown>;
  columns: string[];
  schedule?: string | null;
}

const SUPPORTED_MODULES = [
  'sales',
  'receivables',
  'payables',
  'movements',
  'inventory',
  'orders',
];

const SUPPORTED_FORMATS = ['CSV', 'XLSX', 'PDF'];

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    return this.prisma.exportTemplate.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(companyId: string, userId: string, input: ExportTemplateInput) {
    this.validate(input);
    return this.prisma.exportTemplate.create({
      data: {
        companyId,
        userId,
        name: input.name,
        module: input.module,
        format: input.format,
        filters: input.filters as any,
        columns: input.columns as any,
        schedule: input.schedule ?? null,
      },
    });
  }

  async update(id: string, companyId: string, input: Partial<ExportTemplateInput>) {
    const existing = await this.prisma.exportTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template não encontrado.');
    if (existing.companyId !== companyId) {
      throw new NotFoundException('Template não pertence à empresa.');
    }
    if (input.name !== undefined || input.module || input.format) {
      this.validate({
        name: input.name ?? existing.name,
        module: input.module ?? existing.module,
        format: (input.format ?? existing.format) as any,
        filters: input.filters ?? (existing.filters as any),
        columns: input.columns ?? (existing.columns as any),
      });
    }
    return this.prisma.exportTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.module !== undefined && { module: input.module }),
        ...(input.format !== undefined && { format: input.format }),
        ...(input.filters !== undefined && { filters: input.filters as any }),
        ...(input.columns !== undefined && { columns: input.columns as any }),
        ...(input.schedule !== undefined && { schedule: input.schedule }),
      },
    });
  }

  async remove(id: string, companyId: string) {
    const existing = await this.prisma.exportTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template não encontrado.');
    if (existing.companyId !== companyId) throw new NotFoundException('Não autorizado.');
    await this.prisma.exportTemplate.delete({ where: { id } });
    return true;
  }

  /**
   * Executa um template e retorna o conteúdo (string para CSV, base64 para PDF/XLSX).
   * Hoje só implementa CSV — formatos restantes ficam como TODO marcado.
   */
  async run(id: string, companyId: string): Promise<{ content: string; mimeType: string; filename: string }> {
    const tpl = await this.prisma.exportTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template não encontrado.');
    if (tpl.companyId !== companyId) throw new NotFoundException('Não autorizado.');

    const rows = await this.fetchRows(tpl.module, tpl.filters as any);
    const columns = (tpl.columns as string[]) ?? [];

    if (tpl.format === 'CSV') {
      const csv = this.toCsv(rows, columns);
      const filename = `${tpl.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
      return { content: csv, mimeType: 'text/csv;charset=utf-8', filename };
    }

    throw new BadRequestException(
      `Formato ${tpl.format} ainda não implementado. Use CSV por enquanto.`,
    );
  }

  private validate(input: ExportTemplateInput) {
    if (!SUPPORTED_MODULES.includes(input.module)) {
      throw new BadRequestException(
        `Módulo inválido. Permitidos: ${SUPPORTED_MODULES.join(', ')}`,
      );
    }
    if (!SUPPORTED_FORMATS.includes(input.format)) {
      throw new BadRequestException(
        `Formato inválido. Permitidos: ${SUPPORTED_FORMATS.join(', ')}`,
      );
    }
    if (!input.columns || input.columns.length === 0) {
      throw new BadRequestException('Selecione ao menos 1 coluna.');
    }
  }

  private async fetchRows(module: string, filters: any): Promise<any[]> {
    const today = new Date();
    const from = filters?.from ? new Date(filters.from) : null;
    const to = filters?.to ? new Date(filters.to) : null;

    switch (module) {
      case 'sales':
      case 'orders':
        return this.prisma.order.findMany({
          where: {
            ...(from || to
              ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
              : {}),
          },
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });
      case 'receivables':
        return this.prisma.accountReceivable.findMany({
          where: filters?.status ? { status: filters.status } : undefined,
          include: { customer: { select: { name: true } } },
          orderBy: { dueDate: 'asc' },
          take: 5000,
        });
      case 'payables':
        return this.prisma.accountPayable.findMany({
          where: filters?.status ? { status: filters.status } : undefined,
          orderBy: { dueDate: 'asc' },
          take: 5000,
        });
      case 'movements':
        return this.prisma.cashMovement.findMany({
          where: {
            ...(from || to
              ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
              : {}),
          },
          orderBy: { date: 'desc' },
          take: 5000,
        });
      case 'inventory':
        return this.prisma.product.findMany({
          where: { deletedAt: null },
          orderBy: { nameProduct: 'asc' },
          take: 5000,
        });
      default:
        return [];
    }
  }

  private toCsv(rows: any[], columns: string[]): string {
    const header = columns.join(';');
    const lines = rows.map((r) =>
      columns.map((col) => csvEscape(getNested(r, col))).join(';'),
    );
    return [header, ...lines].join('\n');
  }
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function getNested(obj: any, path: string): unknown {
  return path.split('.').reduce<any>((acc, key) => (acc == null ? acc : acc[key]), obj);
}
