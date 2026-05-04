import { Inject, Injectable } from '@nestjs/common';
import {
  MovementCategory,
  MovementType,
  MovementTypePayment,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface ImportRow {
  id?: string;
  date: Date;
  type: MovementType;
  category: MovementCategory;
  typePayment?: MovementTypePayment;
  value: number;
  description: string;
}

export interface ImportError {
  line: number;
  message: string;
}

export interface ImportResult {
  total: number;
  inserted: number;
  skipped: number;
  errors: ImportError[];
}

@Injectable()
export class ImportCashMovementsUseCase {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async execute(userId: string, csv: string): Promise<ImportResult> {
    const { rows, errors } = parseCsv(csv);
    const total = rows.length + errors.length;

    if (rows.length === 0) {
      return { total, inserted: 0, skipped: 0, errors };
    }

    const data = rows.map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      type: r.type,
      category: r.category,
      typePayment: r.typePayment,
      value: r.value,
      description: r.description,
      date: r.date,
      user_id: userId,
    }));

    const result = await this.prisma.cashMovement.createMany({
      data,
      skipDuplicates: true,
    });

    return {
      total,
      inserted: result.count,
      skipped: rows.length - result.count,
      errors,
    };
  }
}

function parseCsv(input: string): { rows: ImportRow[]; errors: ImportError[] } {
  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];

  const stripped = input.replace(/^﻿/, '');
  const records = splitCsv(stripped);
  if (records.length === 0) return { rows, errors };

  const header = records[0].map((h) => h.trim().toLowerCase());
  const idx = {
    id: header.indexOf('id'),
    date: header.indexOf('data'),
    type: header.indexOf('tipo'),
    category: header.indexOf('categoria'),
    typePayment: header.indexOf('forma_pagamento'),
    value: header.indexOf('valor'),
    description: header.indexOf('descricao'),
  };

  if (
    idx.date < 0 ||
    idx.type < 0 ||
    idx.category < 0 ||
    idx.value < 0 ||
    idx.description < 0
  ) {
    errors.push({
      line: 1,
      message:
        'Cabeçalho inválido. Esperado: id;data;tipo;categoria;forma_pagamento;valor;descricao',
    });
    return { rows, errors };
  }

  for (let i = 1; i < records.length; i++) {
    const cols = records[i];
    if (cols.length === 1 && cols[0].trim() === '') continue;
    const lineNo = i + 1;

    try {
      const date = new Date(cols[idx.date]);
      if (isNaN(date.getTime())) throw new Error('data inválida');

      const type = cols[idx.type].trim().toUpperCase();
      if (!Object.values(MovementType).includes(type as MovementType)) {
        throw new Error(`tipo inválido: ${type}`);
      }

      const category = cols[idx.category].trim().toUpperCase();
      if (
        !Object.values(MovementCategory).includes(category as MovementCategory)
      ) {
        throw new Error(`categoria inválida: ${category}`);
      }

      const rawPay =
        idx.typePayment >= 0 ? cols[idx.typePayment].trim().toUpperCase() : '';
      const typePayment =
        rawPay &&
        Object.values(MovementTypePayment).includes(
          rawPay as MovementTypePayment,
        )
          ? (rawPay as MovementTypePayment)
          : undefined;

      const value = Number(cols[idx.value].replace(',', '.'));
      if (!Number.isFinite(value) || value <= 0)
        throw new Error('valor inválido');

      const description = cols[idx.description].trim();
      if (!description) throw new Error('descrição vazia');

      const id = idx.id >= 0 ? cols[idx.id].trim() || undefined : undefined;

      rows.push({
        id,
        date,
        type: type as MovementType,
        category: category as MovementCategory,
        typePayment,
        value,
        description,
      });
    } catch (err) {
      errors.push({
        line: lineNo,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { rows, errors };
}

function splitCsv(input: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let sep = detectSeparator(input);

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      out.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    out.push(row);
  }
  return out;
}

function detectSeparator(input: string): ',' | ';' {
  const head = input.slice(
    0,
    input.indexOf('\n') >= 0 ? input.indexOf('\n') : input.length,
  );
  return head.split(';').length > head.split(',').length ? ';' : ',';
}
