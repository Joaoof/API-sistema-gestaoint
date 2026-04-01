/* eslint-disable no-unused-vars */

import { Injectable } from '@nestjs/common';
import { CommissionSettings } from '../../ports/sales/commission-rule.repository';
import { PointsCalculator } from './points-calculator.interface';

@Injectable()
export class RevenuePointsCalculator implements PointsCalculator {
  calculate(totalAmount: number, settings: CommissionSettings): number {
    const points = totalAmount * settings.pointsPerCurrencyUnit;
    return Math.floor(points);
  }
}
