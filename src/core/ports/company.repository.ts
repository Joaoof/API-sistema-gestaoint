/* eslint-disable no-unused-vars */

import { Company } from '../entities/company.entity';

export interface CompaniesRepository {
  findById(id: string): Promise<Company | null>;
}
