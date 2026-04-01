/* eslint-disable no-unused-vars */

export type CommissionRuleType = 'PERCENTAGE' | 'FIXED_PER_SALE';

export interface CommissionSettings {
  commissionType: CommissionRuleType;
  commissionValue: number;
  pointsPerCurrencyUnit: number;
}

export interface CommissionRuleRepository {
  getSettings(): Promise<CommissionSettings | null>;
  upsertSettings(settings: CommissionSettings): Promise<CommissionSettings>;
}
