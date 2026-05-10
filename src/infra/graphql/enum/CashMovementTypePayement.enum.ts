import { registerEnumType } from '@nestjs/graphql';

export const MovementTypePayments = {
  CASH: 'CASH',
  PIX: 'PIX',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  BANK_SLIP: 'BANK_SLIP',
  CHECK: 'CHECK',
  OTHER: 'OTHER',
} as const;

export type MovementTypePayment =
  (typeof MovementTypePayments)[keyof typeof MovementTypePayments];

const MovementTypePayment = MovementTypePayments;

registerEnumType(MovementTypePayments, {
  name: 'MovementTypePayment',
});