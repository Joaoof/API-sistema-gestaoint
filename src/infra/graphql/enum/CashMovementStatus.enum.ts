import { registerEnumType } from '@nestjs/graphql';

export const CashMovementStatuses = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  SCHEDULED: 'SCHEDULED',
  CANCELED: 'CANCELED',
  OVERDUE: 'OVERDUE',
} as const;

export type CashMovementStatus =
  (typeof CashMovementStatuses)[keyof typeof CashMovementStatuses];

export const CashMovementStatus = CashMovementStatuses;

registerEnumType(CashMovementStatuses, {
  name: 'CashMovementStatus',
});
