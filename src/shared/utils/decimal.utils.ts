import { Decimal } from '@prisma/client/runtime/library';

/**
 * Converte um valor numérico para Decimal
 */
export function toDecimal(value: number | string | Decimal): Decimal {
  if (value instanceof Decimal) {
    return value;
  }

  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numericValue)) {
    throw new Error(`Valor inválido para conversão em Decimal: ${value}`);
  }

  return new Decimal(numericValue);
}

/**
 * Converte Decimal para number (útil para retornar ao frontend)
 */
export function decimalToNumber(decimal: Decimal | null | undefined): number {
  if (!decimal) return 0;
  return decimal.toNumber();
}

/**
 * Soma dois valores decimais
 */
export function sumDecimals(
  ...decimals: (Decimal | number | null | undefined)[]
): Decimal {
  return decimals.reduce<Decimal>((acc, val) => {
    if (!val) return acc;
    const decimalVal = val instanceof Decimal ? val : new Decimal(val);
    return acc.add(decimalVal);
  }, new Decimal(0));
}
