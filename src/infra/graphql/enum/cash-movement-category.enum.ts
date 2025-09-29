import { registerEnumType } from '@nestjs/graphql';

export const CashMovementCategories = {
  SALE: 'SALE',
  CHANGE: 'CHANGE',
  OTHER_IN: 'OTHER_IN',
  EXPENSE: 'EXPENSE',
  WITHDRAWAL: 'WITHDRAWAL',
  PAYMENT: 'PAYMENT',
} as const;

export type CashMovementCategory =
  (typeof CashMovementCategories)[keyof typeof CashMovementCategories];

registerEnumType(CashMovementCategories, {
  name: 'CashMovementCategory',
});
