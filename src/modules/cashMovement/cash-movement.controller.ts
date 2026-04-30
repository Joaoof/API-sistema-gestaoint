import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FastifyReply, FastifyRequest } from 'fastify';
import { FindAllCashMovementUseCase } from '../../core/use-cases/cashMovement/find-all-cash-movement.use-case';
import {
  ImportCashMovementsUseCase,
  ImportResult,
} from '../../core/use-cases/cashMovement/import-cash-movements.use-case';
import { CashMovement } from '../../core/entities/movements/cash-movement.entity';

interface AuthUser {
  id: string;
}

@Controller('api/cash-movements')
@UseGuards(AuthGuard('jwt'))
export class CashMovementController {
  constructor(
    private readonly findAll: FindAllCashMovementUseCase,
    private readonly importer: ImportCashMovementsUseCase,
  ) {}

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async import(
    @Req() req: FastifyRequest,
    @Body() body: { csv?: unknown },
  ): Promise<ImportResult> {
    const user = (req as FastifyRequest & { user?: AuthUser }).user;
    if (!user?.id) throw new UnauthorizedException();

    const csv = body?.csv;
    if (typeof csv !== 'string' || csv.trim().length === 0) {
      throw new BadRequestException(
        'Body deve conter "csv" como string não vazia.',
      );
    }
    if (csv.length > 5 * 1024 * 1024) {
      throw new BadRequestException('CSV maior que 5 MB.');
    }

    return this.importer.execute(user.id, csv);
  }

  @Get('export')
  async export(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) res: FastifyReply,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ): Promise<void> {
    const user = (req as FastifyRequest & { user?: AuthUser }).user;
    if (!user?.id) throw new UnauthorizedException();
    const startAt = start ? new Date(start) : undefined;
    const endAt = end ? new Date(end) : undefined;

    if (startAt && isNaN(startAt.getTime())) {
      res.status(400).send({ message: 'Parâmetro "start" inválido' });
      return;
    }
    if (endAt && isNaN(endAt.getTime())) {
      res.status(400).send({ message: 'Parâmetro "end" inválido' });
      return;
    }

    const all = await this.findAll.execute(user.id);
    const filtered = all.filter((m) => {
      if (startAt && m.date < startAt) return false;
      if (endAt && m.date > endAt) return false;
      return true;
    });

    const csv = toCsv(filtered);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `movimentacoes-${stamp}.csv`;

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send('﻿' + csv);
  }
}

const HEADERS = [
  'id',
  'data',
  'tipo',
  'categoria',
  'forma_pagamento',
  'valor',
  'descricao',
] as const;

function toCsv(rows: CashMovement[]): string {
  const lines = [HEADERS.join(';')];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.date.toISOString(),
        r.type,
        r.category,
        r.typePayment ?? '',
        r.value.toFixed(2),
        r.description,
      ]
        .map(escapeCsv)
        .join(';'),
    );
  }
  return lines.join('\n');
}

function escapeCsv(value: string | number): string {
  const s = String(value ?? '');
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
