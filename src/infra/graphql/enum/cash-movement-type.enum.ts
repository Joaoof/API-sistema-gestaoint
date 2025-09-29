import { registerEnumType } from '@nestjs/graphql';

export const CashMovementTypes = {
  ENTRY: 'ENTRY',
  EXIT: 'EXIT',
} as const;

export type CashMovementType =
  (typeof CashMovementTypes)[keyof typeof CashMovementTypes];

registerEnumType(CashMovementTypes, {
  name: 'CashMovementType',
});
