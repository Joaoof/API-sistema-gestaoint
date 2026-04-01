/* eslint-disable no-unused-vars */

import { Injectable } from '@nestjs/common';
import { CommissionSettings } from '../../ports/sales/commission-rule.repository';
import { CommissionCalculator } from './commission-calculator.interface';

@Injectable()
export class PercentageCommissionCalculator implements CommissionCalculator {
  calculate(totalAmount: number, settings: CommissionSettings): number {
    if (settings.commissionType === 'FIXED_PER_SALE') {
      return Number(settings.commissionValue.toFixed(2));
    }

    const value = (totalAmount * settings.commissionValue) / 100;
    return Number(value.toFixed(2));
  }
}
