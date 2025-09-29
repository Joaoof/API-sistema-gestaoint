import { CashMovement } from './cash-movement.entity';
import { MovementCategory, MovementType, Prisma } from '@prisma/client';

const MOCK_ID = 'valid-uuid-123';
const MOCK_USER_ID = 'user-abc';
const MOCK_DATE = new Date();

describe('CashMovement Entity (Unit)', () => {
    const baseData = {
        id: MOCK_ID,
        type: MovementType.ENTRY,
        category: MovementCategory.SALE,
        value: 100.00,
        description: 'Venda de produtos',
        date: MOCK_DATE,
        user_id: MOCK_USER_ID,
    };

    it('deve criar uma CashMovement válida com sucesso', () => {
        const movement = new CashMovement(
            baseData.id,
            baseData.type,
            baseData.category,
            baseData.value,
            baseData.description,
            baseData.date,
            baseData.user_id
        );

        expect(movement).toBeInstanceOf(CashMovement);
        expect(movement.id).toBe(MOCK_ID);
        expect(movement.toJSON().value).toBe(100.00);
    });

    it('deve lançar erro se o ID for inválido', () => {
        expect(() => {
            new CashMovement('', baseData.type, baseData.category, baseData.value, baseData.description, baseData.date, baseData.user_id);
        }).toThrow('ID obrigatório.');
    });

    it('deve lançar erro se o tipo de movimentação for inválido', () => {
        expect(() => {
            new CashMovement(baseData.id, 'INVALID_TYPE' as any, baseData.category, baseData.value, baseData.description, baseData.date, baseData.user_id);
        }).toThrow('Tipo de movimentação inválido.');
    });

    it('deve lançar erro se o valor não for positivo', () => {
        expect(() => {
            new CashMovement(baseData.id, baseData.type, baseData.category, 0, baseData.description, baseData.date, baseData.user_id);
        }).toThrow('Valor deve ser positivo.');
    });

    it('deve lançar erro se a descrição for vazia', () => {
        expect(() => {
            new CashMovement(baseData.id, baseData.type, baseData.category, baseData.value, ' ', baseData.date, baseData.user_id);
        }).toThrow('Descrição é obrigatória.');
    });

    it('deve converter corretamente de Prisma para Entity', () => {
        const prismaData = {
            ...baseData,
            value: new Prisma.Decimal(100.00),
            date: MOCK_DATE,
        };

        const movement = CashMovement.fromPrisma(prismaData);

        expect(movement.value).toBe(100.00);
        expect(movement.date).toEqual(MOCK_DATE);
        expect(movement.user_id).toBe(MOCK_USER_ID);
    });
});