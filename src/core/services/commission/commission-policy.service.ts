/* eslint-disable no-unused-vars */

import { Inject, Injectable } from '@nestjs/common';
import {
  CommissionRuleRepository,
  CommissionSettings,
} from '../../ports/sales/commission-rule.repository';
import { CommissionCalculator } from './commission-calculator.interface';
import { PointsCalculator } from './points-calculator.interface';

@Injectable()
export class CommissionPolicyService {
  constructor(
    @Inject('CommissionRuleRepository')
    private readonly commissionRuleRepository: CommissionRuleRepository,
    @Inject('CommissionCalculator')
    private readonly commissionCalculator: CommissionCalculator,
    @Inject('PointsCalculator')
    private readonly pointsCalculator: PointsCalculator,
  ) {}

  async getSettings(): Promise<CommissionSettings> {
    const settings = await this.commissionRuleRepository.getSettings();
    if (!settings) {
      return {
        commissionType: 'PERCENTAGE',
        commissionValue: 5,
        pointsPerCurrencyUnit: 1,
      };
    }

    return settings;
  }

  async evaluateSale(totalAmount: number): Promise<{
    commissionAmount: number;
    pointsEarned: number;
    settings: CommissionSettings;
  }> {
    const settings = await this.getSettings();
    return {
      commissionAmount: this.commissionCalculator.calculate(
        totalAmount,
        settings,
      ),
      pointsEarned: this.pointsCalculator.calculate(totalAmount, settings),
      settings,
    };
  }

  async updateSettings(
    settings: CommissionSettings,
  ): Promise<CommissionSettings> {
    return this.commissionRuleRepository.upsertSettings(settings);
  }
}
