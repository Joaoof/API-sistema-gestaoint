// src/core/entities/gift.entity.ts
import { Prisma } from '@prisma/client';
import { toDecimal } from 'src/shared/utils/decimal.utils';

export class Gift {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string,
    public price: number,
    public imageUrl?: string,
    public status: 'available' | 'reserved' = 'available',
    public createdAt: Date = new Date(),
  ) {}

  // Ajustado para aceitar objetos que vêm direto do Prisma
  static fromPrisma(data: {
    id: string;
    name: string;
    description: string | null;
    price: Prisma.Decimal;
    imageUrl: string | null;
    status: string;
    createdAt: Date;
  }): Gift {
    return new Gift(
      data.id,
      data.name,
      data.description ?? '', // aqui resolvemos o problema
      toDecimal(data.price).toNumber(),
      data.imageUrl ?? undefined,
      ['available', 'reserved'].includes(data.status)
        ? (data.status as 'available' | 'reserved')
        : 'available',
      data.createdAt,
    );
  }
}
