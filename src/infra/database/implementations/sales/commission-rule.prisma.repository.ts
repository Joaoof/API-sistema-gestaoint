/* eslint-disable no-unused-vars */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  CommissionRuleRepository,
  CommissionSettings,
} from '../../../../core/ports/sales/commission-rule.repository';

const COMMISSION_RULE_KEY = 'default';

@Injectable()
export class PrismaCommissionRuleRepository implements CommissionRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<CommissionSettings | null> {
    const rule = await this.prisma.commissionRuleConfig.findUnique({
      where: { key: COMMISSION_RULE_KEY },
    });

    if (!rule) {
      return null;
    }

    return {
      commissionType: rule.commissionType,
      commissionValue: Number(rule.commissionValue),
      pointsPerCurrencyUnit: Number(rule.pointsPerCurrencyUnit),
    };
  }

  async upsertSettings(
    settings: CommissionSettings,
  ): Promise<CommissionSettings> {
    const updated = await this.prisma.commissionRuleConfig.upsert({
      where: { key: COMMISSION_RULE_KEY },
      create: {
        key: COMMISSION_RULE_KEY,
        commissionType: settings.commissionType,
        commissionValue: settings.commissionValue,
        pointsPerCurrencyUnit: settings.pointsPerCurrencyUnit,
      },
      update: {
        commissionType: settings.commissionType,
        commissionValue: settings.commissionValue,
        pointsPerCurrencyUnit: settings.pointsPerCurrencyUnit,
      },
    });

    return {
      commissionType: updated.commissionType,
      commissionValue: Number(updated.commissionValue),
      pointsPerCurrencyUnit: Number(updated.pointsPerCurrencyUnit),
    };
  }
}
