import { UseGuards } from '@nestjs/common';
import { Args, Field, Float, ID, Int, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { ReconciliationService } from './use-cases/reconciliation.service';

@ObjectType()
class StatementItemEntity {
  @Field(() => ID) id!: string;
  @Field() importId!: string;
  @Field() bankId!: string;
  @Field(() => String, { nullable: true }) fitId?: string | null;
  @Field() trnType!: string;
  @Field() postedAt!: Date;
  @Field(() => Float) amount!: number;
  @Field(() => String, { nullable: true }) memo?: string | null;
  @Field() matchedStatus!: string;
  @Field(() => String, { nullable: true }) cashMovementId?: string | null;
}

@ObjectType()
class StatementImportEntity {
  @Field(() => ID) id!: string;
  @Field() bankId!: string;
  @Field() fileName!: string;
  @Field() format!: string;
  @Field() rangeStart!: Date;
  @Field() rangeEnd!: Date;
  @Field(() => Int) totalItems!: number;
  @Field(() => Int) matchedItems!: number;
  @Field() createdAt!: Date;
  @Field(() => [StatementItemEntity], { nullable: true }) items?: StatementItemEntity[];
}

@ObjectType()
class ImportOfxResult {
  @Field(() => StatementImportEntity) import!: StatementImportEntity;
  @Field(() => Int) itemsCreated!: number;
  @Field(() => Int) duplicatesSkipped!: number;
}

@ObjectType()
class AutoMatchResult {
  @Field(() => Int) matched!: number;
  @Field(() => Int) total!: number;
}

function toItem(r: any): StatementItemEntity {
  return {
    id: r.id,
    importId: r.importId,
    bankId: r.bankId,
    fitId: r.fitId,
    trnType: r.trnType,
    postedAt: r.postedAt,
    amount: Number(r.amount),
    memo: r.memo,
    matchedStatus: r.matchedStatus,
    cashMovementId: r.cashMovementId,
  };
}

function toImport(r: any): StatementImportEntity {
  return {
    id: r.id,
    bankId: r.bankId,
    fileName: r.fileName,
    format: r.format,
    rangeStart: r.rangeStart,
    rangeEnd: r.rangeEnd,
    totalItems: r.totalItems,
    matchedItems: r.matchedItems,
    createdAt: r.createdAt,
    items: r.items?.map(toItem),
  };
}

@Resolver()
@UseGuards(GqlAuthGuard)
export class ReconciliationResolver {
  constructor(
    private readonly service: ReconciliationService,
    private readonly tenancy: TenancyService,
  ) {}

  @Mutation(() => ImportOfxResult)
  async importOfxStatement(
    @CurrentUser() user: User,
    @Args('bankId') bankId: string,
    @Args('fileName') fileName: string,
    @Args('content') content: string,
  ): Promise<ImportOfxResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const out = await this.service.importOfx(
      { userId: user.id, companyId },
      { bankId, fileName, content },
    );
    return {
      import: toImport(out.import),
      itemsCreated: out.itemsCreated,
      duplicatesSkipped: out.duplicatesSkipped,
    };
  }

  @Mutation(() => AutoMatchResult)
  async autoMatchStatement(
    @CurrentUser() user: User,
    @Args('importId') importId: string,
  ): Promise<AutoMatchResult> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.autoMatch({ userId: user.id, companyId }, importId);
  }

  @Mutation(() => StatementItemEntity)
  async manualMatchStatementItem(
    @CurrentUser() user: User,
    @Args('itemId') itemId: string,
    @Args('cashMovementId') cashMovementId: string,
  ): Promise<StatementItemEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const item = await this.service.manualMatch(
      { userId: user.id, companyId },
      itemId,
      cashMovementId,
    );
    return toItem(item);
  }

  @Mutation(() => Boolean)
  async createMovementFromStatementItem(
    @CurrentUser() user: User,
    @Args('itemId') itemId: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    await this.service.createMovementFromItem({ userId: user.id, companyId }, itemId);
    return true;
  }

  @Mutation(() => Boolean)
  async ignoreStatementItem(
    @CurrentUser() user: User,
    @Args('itemId') itemId: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    await this.service.ignore({ userId: user.id, companyId }, itemId);
    return true;
  }

  @Query(() => [StatementImportEntity])
  async statementImports(@CurrentUser() user: User): Promise<StatementImportEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.service.listImports(companyId);
    return rows.map(toImport);
  }

  @Query(() => StatementImportEntity)
  async statementImport(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<StatementImportEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const imp = await this.service.getImport(companyId, id);
    return toImport(imp);
  }
}
