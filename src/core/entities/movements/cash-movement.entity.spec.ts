import { CashMovement } from './cash-movement.entity';
import {
  MovementCategory,
  MovementStatus,
  MovementType,
  MovementTypePayment,
  Prisma,
} from '@prisma/client';

const MOCK_ID = 'valid-uuid-123';
const MOCK_USER_ID = 'user-abc';
const MOCK_DATE = new Date();

describe('CashMovement Entity (Unit)', () => {
  const baseProps = {
    id: MOCK_ID,
    type: MovementType.ENTRY,
    category: MovementCategory.SALE,
    typePayment: MovementTypePayment.CASH,
    value: 100.0,
    description: 'Venda de produtos',
    date: MOCK_DATE,
    user_id: MOCK_USER_ID,
  };

  it('deve criar uma CashMovement válida com sucesso', () => {
    const movement = new CashMovement(baseProps);

    expect(movement).toBeInstanceOf(CashMovement);
    expect(movement.id).toBe(MOCK_ID);
    expect(movement.toJSON().value).toBe(100.0);
    expect(movement.status).toBe(MovementStatus.COMPLETED);
  });

  it('deve lançar erro se o ID for inválido', () => {
    expect(() => new CashMovement({ ...baseProps, id: '' })).toThrow(
      'ID obrigatório.',
    );
  });

  it('deve lançar erro se o tipo de movimentação for inválido', () => {
    expect(
      () =>
        new CashMovement({
          ...baseProps,
          type: 'INVALID_TYPE' as MovementType,
        }),
    ).toThrow('Tipo de movimentação inválido.');
  });

  it('deve lançar erro se o valor não for positivo', () => {
    expect(() => new CashMovement({ ...baseProps, value: 0 })).toThrow(
      'Valor deve ser positivo.',
    );
  });

  it('deve lançar erro se a descrição for vazia', () => {
    expect(() => new CashMovement({ ...baseProps, description: ' ' })).toThrow(
      'Descrição é obrigatória.',
    );
  });

  it('deve converter corretamente de Prisma para Entity', () => {
    const prismaData = {
      ...baseProps,
      value: new Prisma.Decimal(100.0),
      date: MOCK_DATE,
      status: MovementStatus.COMPLETED,
      referenceCode: null,
      counterpartyName: null,
      counterpartyDocument: null,
      notes: null,
      attachmentUrl: null,
      dueDate: null,
      paidAt: null,
      bankId: null,
      orderId: null,
      accountReceivableId: null,
      customerId: null,
      createdAt: MOCK_DATE,
      updatedAt: MOCK_DATE,
    };

    const movement = CashMovement.fromPrisma(prismaData);

    expect(movement.value).toBe(100.0);
    expect(movement.date).toEqual(MOCK_DATE);
    expect(movement.user_id).toBe(MOCK_USER_ID);
    expect(movement.status).toBe(MovementStatus.COMPLETED);
  });
});
