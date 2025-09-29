import { CreateCashMovementUseCase } from './create-cash-movement.use-case';
import { FindAllCashMovementUseCase } from './find-all-cash-movement.use-case';
import { DashboardMovementUseCase } from './dashboard-movement.use-case';
import { CashMovementRepository } from 'src/core/ports/cash-movement.repository';
import { CashMovement } from 'src/core/entities/movements/cash-movement.entity';
import { MovementCategory, MovementType } from '@prisma/client';
import { ZodError } from 'zod';
import { DashboardMovement } from 'src/core/entities/dashboard-movement.entity';
import { FindAllCashMovementInput } from './dtos/find-all-cash-movement.input';


// NOVO: Definições Mockadas (Interfaces que espelham o que foi removido)
interface CreateCashMovementDto {
    type: MovementType;
    category: MovementCategory;
    value: number;
    description: string;
    user_id: string;
    date: Date;
}

// Mock para simular o crypto.randomUUID() usado no mapper
jest.mock('crypto', () => ({
    randomUUID: jest.fn(() => 'mov-new-uuid'),
}));

// --- Mocks com tipagem Jest.Mock ---
const mockCashMovementRepo: Record<keyof CashMovementRepository, jest.Mock> = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    dashboardMovement: jest.fn(),
};

const MOCK_USER_ID_VALID = 'b738c8c5-23f2-4d01-a1c2-678901234567';
const MOCK_USER_ID_INVALID = 'not-a-uuid-fail';
const MOCK_DATE_ISO = '2025-09-29';

describe('CashMovement Use Cases (Unit)', () => {
    let createUseCase: CreateCashMovementUseCase;
    let findAllUseCase: FindAllCashMovementUseCase;
    let dashboardUseCase: DashboardMovementUseCase;

    beforeEach(() => {
        createUseCase = new CreateCashMovementUseCase(mockCashMovementRepo as any);
        findAllUseCase = new FindAllCashMovementUseCase(mockCashMovementRepo as any);
        dashboardUseCase = new DashboardMovementUseCase(mockCashMovementRepo as any);
        jest.clearAllMocks();
    });

    // Teste: CreateCashMovementUseCase (Criação)
    describe('CreateCashMovementUseCase', () => {
        const validDto: CreateCashMovementDto = {
            type: MovementType.ENTRY,
            category: MovementCategory.SALE,
            value: 150.75,
            description: 'Venda do dia',
            user_id: MOCK_USER_ID_VALID,
            date: new Date(),
        };

        it('deve criar a movimentação e chamar o repositório', async () => {
            mockCashMovementRepo.create.mockResolvedValue(undefined);

            const result = await createUseCase.execute(validDto, MOCK_USER_ID_VALID);

            expect(mockCashMovementRepo.create).toHaveBeenCalledTimes(1);
            const createdMovement = mockCashMovementRepo.create.mock.calls[0][0];
            expect(createdMovement).toBeInstanceOf(CashMovement);
            expect(result.value).toBe(150.75);
        });

        it('deve lançar ZodError se o DTO for inválido', async () => {
            const invalidDto = { ...validDto, value: -10 } as CreateCashMovementDto;
            await expect(createUseCase.execute(invalidDto, MOCK_USER_ID_VALID)).rejects.toThrow(ZodError);
            expect(mockCashMovementRepo.create).not.toHaveBeenCalled();
        });
    });

    // Teste: FindAllCashMovementUseCase (Listagem)
    describe('FindAllCashMovementUseCase', () => {
        it('deve chamar o repositório para listar todas as movimentações do usuário', async () => {
            mockCashMovementRepo.findAll.mockResolvedValue([]);

            await findAllUseCase.execute(MOCK_USER_ID_VALID, { value: 100 } as FindAllCashMovementInput);

            expect(mockCashMovementRepo.findAll).toHaveBeenCalledWith(MOCK_USER_ID_VALID, { value: 100 });
        });
    });

    // Teste: DashboardMovementUseCase (Estatísticas)
    describe('DashboardMovementUseCase', () => {
        const mockDashboardResult = new DashboardMovement(100, 50, 50, 1000);

        it('deve chamar o repositório com a data fornecida', async () => {
            mockCashMovementRepo.dashboardMovement.mockResolvedValue(mockDashboardResult);

            await dashboardUseCase.execute(MOCK_USER_ID_VALID, MOCK_DATE_ISO);

            expect(mockCashMovementRepo.dashboardMovement).toHaveBeenCalledWith(MOCK_USER_ID_VALID, MOCK_DATE_ISO);
        });

        it('deve chamar o repositório com a data de hoje por padrão se for passada string vazia', async () => {
            mockCashMovementRepo.dashboardMovement.mockResolvedValue(mockDashboardResult);

            const dateInput = '';

            await dashboardUseCase.execute(MOCK_USER_ID_VALID, dateInput);

            const receivedUserId = mockCashMovementRepo.dashboardMovement.mock.calls[0][0];
            const receivedDate = mockCashMovementRepo.dashboardMovement.mock.calls[0][1];

            expect(receivedUserId).toBe(MOCK_USER_ID_VALID);
            // Verifica se o Zod transformou para o formato YYYY-MM-DD (data de hoje)
            expect(receivedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('deve lançar ZodError se o userId for inválido (CORRIGIDO)', async () => {
            // Agora, este teste DEVE falhar, lançando ZodError, devido ao `.uuid()` no DTO.
            await expect(dashboardUseCase.execute(MOCK_USER_ID_INVALID, MOCK_DATE_ISO)).rejects.toThrow(ZodError);
            expect(mockCashMovementRepo.dashboardMovement).not.toHaveBeenCalled();
        });
    });
});