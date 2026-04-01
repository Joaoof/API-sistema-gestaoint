/* eslint-disable no-unused-vars */

import { CommissionSettings } from '../../ports/sales/commission-rule.repository';

export interface PointsCalculator {
  calculate(totalAmount: number, settings: CommissionSettings): number;
}
