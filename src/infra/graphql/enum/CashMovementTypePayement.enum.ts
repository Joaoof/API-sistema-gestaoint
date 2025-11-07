import { registerEnumType } from '@nestjs/graphql';

export const MovementTypePayments = {
  CASH: 'CASH',
  PIX: 'PIX',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  OTHER: 'OTHER',
} as const;

export type MovementTypePayment =
  (typeof MovementTypePayments)[keyof typeof MovementTypePayments];

const MovementTypePayment = MovementTypePayments;

registerEnumType(MovementTypePayments, {
  name: 'MovementTypePayment',
});