import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/core/entities/user.entity';
import {
  CashMovementGraphQL,
  CashMovementPage,
} from '../../dto/cash-movement.dto';
import { CreateCashMovementUseCase } from 'src/core/use-cases/cashMovement/create-cash-movement.use-case';
import { FindAllCashMovementUseCase } from 'src/core/use-cases/cashMovement/find-all-cash-movement.use-case';
import { CashMovementMapper } from '../../../../core/mappers/cash-movement.mapper';
import { CreateCashMovementInput } from '../../dto/create-cash-movement.dto';
import { CashMovementType } from '../../enum/CashMovementType.enum';
import { CashMovementCategory } from '../../enum/CashMovementCategory.enum';
import { MovementTypePayment } from '../../enum/CashMovementTypePayement.enum';
import { CashMovementStatus } from '../../enum/CashMovementStatus.enum';
import { FindAllCashMovementInput } from 'src/core/use-cases/cashMovement/dtos/find-all-cash-movement.input';
import { DashboardStats } from '../../dto/dashboard-stats.entity';
import { DashboardMovementUseCase } from 'src/core/use-cases/cashMovement/dashboard-movement.use-case';
import { DashboardStatsInput } from '../../dto/dashboard-stats.input';
import { DeleteCashMovementUseCase } from '../../../../core/use-cases/cashMovement/delete-cash-movement.use-case';
import { UpdateCashMovementInput } from '../../../../core/use-cases/cashMovement/dtos/update-cash-movement.input';
import { UpdateCashMovementUseCase } from 'src/core/use-cases/cashMovement/update-cash-movement.use-case';
import { FindPaginatedCashMovementUseCase } from 'src/core/use-cases/cashMovement/find-paginated-cash-movement.use-case';

const CATEGORY_SUCCESS_MESSAGES: Record<string, string> = {
  SALE: 'Venda registrada com sucesso!',
  CHANGE: 'Troco registrado com sucesso!',
  OTHER_IN: 'Entrada registrada com sucesso!',
  EXPENSE: 'Despesa registrada com sucesso!',
  WITHDRAWAL: 'Saque registrado com sucesso!',
  PAYMENT: 'Pagamento registrado com sucesso!',
};

@Resolver(() => CashMovementGraphQL)
export class CashMovementResolver {
  constructor(
    private readonly createCashMovementUseCase: CreateCashMovementUseCase,
    private readonly findAllCashMovementUseCase: FindAllCashMovementUseCase,
    private readonly dashboardMovementUseCase: DashboardMovementUseCase,
    private readonly deleteCashMovementUseCase: DeleteCashMovementUseCase,
    private readonly updateCashMovementUseCase: UpdateCashMovementUseCase,
    private readonly findPaginatedCashMovementUseCase: FindPaginatedCashMovementUseCase,
  ) {}

  @Mutation(() => CashMovementGraphQL)
  @UseGuards(GqlAuthGuard)
  async createCashMovement(
    @Args('input') input: CreateCashMovementInput,
    @CurrentUser() user: User,
  ): Promise<CashMovementGraphQL> {
    const movement = await this.createCashMovementUseCase.execute(
      { ...input, user_id: user.id },
      user.id,
    );

    const message =
      CATEGORY_SUCCESS_MESSAGES[movement.category] ||
      'Movimentação registrada com sucesso!';

    return this.toGraphQL(movement, message);
  }

  @Query(() => [CashMovementGraphQL], { name: 'cashMovements' })
  @UseGuards(GqlAuthGuard)
  async findAllCashMovement(
    @Args('input', { nullable: true }) input: FindAllCashMovementInput,
    @CurrentUser() user: User,
  ): Promise<CashMovementGraphQL[]> {
    const movements = await this.findAllCashMovementUseCase.execute(
      user.id,
      input,
    );
    return movements.map((m) => this.toGraphQL(m));
  }

  @Query(() => CashMovementPage, { name: 'cashMovementsHistory' })
  @UseGuards(GqlAuthGuard)
  async cashMovementsHistory(
    @Args('input', { nullable: true }) input: FindAllCashMovementInput,
    @CurrentUser() user: User,
  ): Promise<CashMovementPage> {
    const result = await this.findPaginatedCashMovementUseCase.execute(
      user.id,
      input,
    );

    return {
      items: result.items.map((m) => this.toGraphQL(m)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      summary: result.summary,
    };
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => DashboardStats, { name: 'dashboardStats' })
  async dashboardStats(
    @Args('input', { nullable: true }) input: DashboardStatsInput,
    @CurrentUser() user: User,
  ) {
    const date = input?.date || undefined;
    const dashboard = await this.dashboardMovementUseCase.execute(
      user.id,
      date ?? '',
    );
    return dashboard.toJSON();
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async cashMovementDelete(
    @Args('movementId') movementId: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.deleteCashMovementUseCase.execute(user.id, movementId);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async cashMovementUpdate(
    @Args('movementId', { type: () => String }) movementId: string,
    @Args('movementUpdateCash') movementUpdateCash: UpdateCashMovementInput,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.updateCashMovementUseCase.execute(
      movementId,
      movementUpdateCash,
      user.id,
    );
  }

  private toGraphQL(movement: any, message?: string): CashMovementGraphQL {
    const json = CashMovementMapper.toJSON(movement);
    return {
      id: json.id,
      type: json.type as CashMovementType,
      category: json.category as CashMovementCategory,
      typePayment: json.typePayment as MovementTypePayment | null,
      status: json.status as CashMovementStatus,
      value: json.value,
      description: json.description,
      date: json.date,
      dueDate: json.dueDate ?? null,
      paidAt: json.paidAt ?? null,
      referenceCode: json.referenceCode,
      counterpartyName: json.counterpartyName,
      counterpartyDocument: json.counterpartyDocument,
      notes: json.notes,
      attachmentUrl: json.attachmentUrl,
      bankId: json.bankId,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      user_id: json.user_id ?? '',
      message,
    };
  }
}
