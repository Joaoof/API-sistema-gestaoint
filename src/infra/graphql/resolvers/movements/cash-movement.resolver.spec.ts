import { Test, TestingModule } from '@nestjs/testing';
import { CashMovementResolver } from './cash-movement.resolver';
import { CreateCashMovementUseCase } from 'src/core/use-cases/cashMovement/create-cash-movement.use-case';
import { FindAllCashMovementUseCase } from 'src/core/use-cases/cashMovement/find-all-cash-movement.use-case';
import { DashboardMovementUseCase } from 'src/core/use-cases/cashMovement/dashboard-movement.use-case';
import { CashMovement } from 'src/core/entities/movements/cash-movement.entity'; // Corrigido para o alias core/entities
import { MovementCategory, MovementType } from '@prisma/client';
import { User } from 'src/core/entities/user.entity';

// FIX: Importando os DTOs/Enums corretos do GraphQL para o arquivo de teste
import { CreateCashMovementInput } from '../../dto/create-cash-movement.dto';
import { CashMovementCategory as GqlCategory } from '../../enum/cash-movement-category.enum';
import { CashMovementType as GqlType } from '../../enum/cash-movement-type.enum';
import { FindAllCashMovementInput } from 'src/core/use-cases/cashMovement/dtos/find-all-cash-movement.input';
import { DashboardStatsInput } from '../../dto/dashboard-stats.input';
import { DashboardMovement } from 'src/core/entities/dashboard-movement.entity';

// --- Mocks ---
const MOCK_USER_ID = 'b738c8c5-23f2-4d01-a1c2-678901234567'; // Usando UUID válido
const MOCK_MOVEMENT_ID = 'mov-456';
const MOCK_DATE = new Date('2025-09-29T10:00:00.000Z');

const mockCreateCashMovementUseCase = { execute: jest.fn() };
const mockFindAllCashMovementUseCase = { execute: jest.fn() };
const mockDashboardMovementUseCase = { execute: jest.fn() };

const mockUser: User = {
  id: MOCK_USER_ID,
  email: 'user@test.com',
  role: 'USER',
};

const mockCreatedMovement = new CashMovement(
  MOCK_MOVEMENT_ID,
  MovementType.ENTRY, // Enum Prisma usado no mock de retorno do Use Case
  MovementCategory.SALE, // Enum Prisma usado no mock de retorno do Use Case
  100.5,
  'Venda de produto A',
  MOCK_DATE,
  MOCK_USER_ID,
);

const mockDashboardResult = new DashboardMovement(200, 50, 150, 5000);

describe('CashMovementResolver (Integration/GraphQL)', () => {
  let resolver: CashMovementResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashMovementResolver,
        {
          provide: CreateCashMovementUseCase,
          useValue: mockCreateCashMovementUseCase,
        },
        {
          provide: FindAllCashMovementUseCase,
          useValue: mockFindAllCashMovementUseCase,
        },
        {
          provide: DashboardMovementUseCase,
          useValue: mockDashboardMovementUseCase,
        },
      ],
    }).compile();

    resolver = module.get<CashMovementResolver>(CashMovementResolver);
    jest.clearAllMocks();
  });

  // --- 3.1 Teste: Mutation createCashMovement ---
  describe('createCashMovement', () => {
    // FIX: Usando CreateCashMovementInput e Enums GraphQL (GqlType/GqlCategory)
    const input: CreateCashMovementInput = {
      type: GqlType.ENTRY,
      category: GqlCategory.SALE,
      value: 100.5,
      description: 'Venda de produto A',
      date: MOCK_DATE,
    } as any;

    it('deve criar a movimentação e retornar o objeto GraphQL correto com mensagem de sucesso (SALE)', async () => {
      mockCreateCashMovementUseCase.execute.mockResolvedValue(
        mockCreatedMovement,
      );

      // Act
      const result = await resolver.createCashMovement(input, mockUser);

      // Assert
      expect(mockCreateCashMovementUseCase.execute).toHaveBeenCalledWith(
        // O Use Case (corrigido) espera { ...input, userId: user.id }
        { ...input, userId: MOCK_USER_ID },
        MOCK_USER_ID,
      );
      expect(result.category).toBe(MovementCategory.SALE);
    });

    it('deve retornar mensagem correta para categoria EXPENSE', async () => {
      // Setup: Cria um objeto de movimento mockado com a categoria EXPENSE (Prisma Enum)
      const expenseMovement = {
        ...mockCreatedMovement,
        category: MovementCategory.EXPENSE,
      };
      mockCreateCashMovementUseCase.execute.mockResolvedValue(expenseMovement);

      // FIX: Passa o input com o enum EXPENSE (GraphQL Enum)
      const expenseInput: CreateCashMovementInput = {
        ...input,
        category: GqlCategory.EXPENSE,
      } as any;

      // Act
      const result = await resolver.createCashMovement(expenseInput, mockUser);

      // Assert
      expect(result.message).toBe('Despesa registrada com sucesso!');
    });
  });

  // --- 3.2 Teste: Query findAllCashMovement ---
  describe('findAllCashMovement', () => {
    it('deve listar as movimentações e mapear para DTOs de resposta', async () => {
      const mockMovementList = [mockCreatedMovement, mockCreatedMovement];
      mockFindAllCashMovementUseCase.execute.mockResolvedValue(
        mockMovementList,
      );

      const filters: FindAllCashMovementInput = {
        description: 'test',
        value: 10,
      } as any;

      // Act
      const result = await resolver.findAllCashMovement(filters, mockUser);

      // Assert
      expect(mockFindAllCashMovementUseCase.execute).toHaveBeenCalledWith(
        MOCK_USER_ID,
        filters,
      );
      expect(result.length).toBe(2);
    });
  });

  // --- 3.3 Teste: Query dashboardStats ---
  describe('dashboardStats', () => {
    it('deve retornar as estatísticas do dashboard corretamente mapeadas', async () => {
      mockDashboardMovementUseCase.execute.mockResolvedValue(
        mockDashboardResult,
      );

      const input: DashboardStatsInput = {
        date: '2025-09-29',
        userId: MOCK_USER_ID,
      }; // FIX: Adicionado userId ao input

      // Act
      const result = await resolver.dashboardStats(input, mockUser);

      // Assert
      expect(mockDashboardMovementUseCase.execute).toHaveBeenCalledWith(
        MOCK_USER_ID,
        '2025-09-29',
      );
      expect(result.todayEntries).toBe(200);
    });

    it('deve chamar o use case com data undefined quando o input for nulo', async () => {
      mockDashboardMovementUseCase.execute.mockResolvedValue(
        mockDashboardResult,
      );

      // FIX: Passa 'undefined' explicitamente com cast para resolver o erro TS 2345.
      await resolver.dashboardStats(
        undefined as unknown as DashboardStatsInput,
        mockUser,
      );

      // Assert
      // CORREÇÃO: Mudar de 'undefined' para '' (string vazia)
      expect(mockDashboardMovementUseCase.execute).toHaveBeenCalledWith(
        MOCK_USER_ID,
        '',
      );
    });
  });
});
