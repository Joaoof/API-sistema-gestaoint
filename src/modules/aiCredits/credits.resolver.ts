import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { SuperAdminGuard } from '../../auth/guards/super-admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import {
  AiCreditAccountEntity,
  AiCreditPackageEntity,
  AiCreditPurchaseEntity,
  AiCreditTransactionEntity,
} from './entities/credits.entities';
import { AiCreditsService, CREDIT_PACKAGES } from './use-cases/credits.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Resolver()
@UseGuards(GqlAuthGuard)
export class AiCreditsResolver {
  constructor(
    private readonly service: AiCreditsService,
    private readonly tenancy: TenancyService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => AiCreditAccountEntity)
  async myAiCreditAccount(@CurrentUser() user: User): Promise<AiCreditAccountEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const acc = await this.service.getOrCreateAccount(companyId);
    return {
      id: acc.id,
      companyId: acc.companyId,
      balance: acc.balance,
      lowThreshold: acc.lowThreshold,
      totalPurchased: acc.totalPurchased,
      totalConsumed: acc.totalConsumed,
      isLow: acc.balance <= acc.lowThreshold,
      isEmpty: acc.balance <= 0,
    };
  }

  @Query(() => [AiCreditPackageEntity])
  aiCreditPackages(): AiCreditPackageEntity[] {
    return CREDIT_PACKAGES.map((p) => ({
      brl: p.brl,
      base: p.base,
      bonus: p.bonus,
      total: p.base + p.bonus,
      badge: p.bonus > 0 ? `+${Math.round((p.bonus / p.base) * 100)}% bônus` : null,
    }));
  }

  @Mutation(() => AiCreditPurchaseEntity)
  async requestAiCreditPurchase(
    @CurrentUser() user: User,
    @Args('packageBrl', { type: () => Int }) packageBrl: number,
  ): Promise<AiCreditPurchaseEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const p = await this.service.requestPurchase({
      companyId,
      packageBrl,
      userId: user.id,
    });
    return {
      id: p.id,
      companyId: p.companyId,
      packageBrl: p.packageBrl,
      creditsTotal: p.creditsTotal,
      pixKey: p.pixKey,
      pixCopyPaste: p.pixCopyPaste,
      pixTxid: p.pixTxid,
      status: p.status,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
    };
  }

  @Mutation(() => Boolean)
  async cancelAiCreditPurchase(
    @CurrentUser() user: User,
    @Args('purchaseId') purchaseId: string,
  ): Promise<boolean> {
    await this.service.cancelPurchase({ purchaseId, userId: user.id });
    return true;
  }

  @Query(() => [AiCreditPurchaseEntity])
  async myAiCreditPurchases(@CurrentUser() user: User): Promise<AiCreditPurchaseEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.service.listPurchases({ companyId, limit: 50 });
    return rows.map((p) => ({
      id: p.id,
      companyId: p.companyId,
      packageBrl: p.packageBrl,
      creditsTotal: p.creditsTotal,
      pixKey: p.pixKey,
      pixCopyPaste: p.pixCopyPaste,
      pixTxid: p.pixTxid,
      status: p.status,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
    }));
  }

  @Query(() => [AiCreditTransactionEntity])
  async myAiCreditTransactions(
    @CurrentUser() user: User,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<AiCreditTransactionEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.service.listTransactions({ companyId, limit });
    return rows.map((t) => ({
      id: t.id,
      kind: t.kind,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      refType: t.refType,
      refId: t.refId,
      createdAt: t.createdAt,
    }));
  }

  // ============ Super-admin ============

  @Query(() => [AiCreditPurchaseEntity])
  @UseGuards(GqlAuthGuard, SuperAdminGuard)
  async pendingAiCreditPurchases(): Promise<AiCreditPurchaseEntity[]> {
    const rows = await this.service.listPurchases({ status: 'PENDING', limit: 200 });
    const enriched = await Promise.all(
      rows.map(async (p) => {
        const company = await this.prisma.company.findUnique({
          where: { id: p.companyId },
          select: { name: true },
        });
        const creator = await this.prisma.users.findUnique({
          where: { id: p.createdByUserId },
          select: { name: true, email: true },
        });
        return {
          id: p.id,
          companyId: p.companyId,
          packageBrl: p.packageBrl,
          creditsTotal: p.creditsTotal,
          pixKey: p.pixKey,
          pixCopyPaste: p.pixCopyPaste,
          pixTxid: p.pixTxid,
          status: p.status,
          paidAt: p.paidAt,
          createdAt: p.createdAt,
          expiresAt: p.expiresAt,
          companyName: company?.name ?? null,
          createdByName: creator ? `${creator.name} (${creator.email})` : null,
        };
      }),
    );
    return enriched;
  }

  @Mutation(() => AiCreditPurchaseEntity)
  @UseGuards(GqlAuthGuard, SuperAdminGuard)
  async confirmAiCreditPurchase(
    @CurrentUser() user: User,
    @Args('purchaseId') purchaseId: string,
  ): Promise<AiCreditPurchaseEntity> {
    const p = await this.service.confirmPurchase({
      purchaseId,
      superAdminUserId: user.id,
    });
    return {
      id: p.id,
      companyId: p.companyId,
      packageBrl: p.packageBrl,
      creditsTotal: p.creditsTotal,
      pixKey: p.pixKey,
      pixCopyPaste: p.pixCopyPaste,
      pixTxid: p.pixTxid,
      status: p.status,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
    };
  }
}
