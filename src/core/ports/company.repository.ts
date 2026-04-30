/* eslint-disable no-unused-vars */

import { Company } from '../entities/company.entity';

export interface UpdateCompanyData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  cnpj?: string | null;
  logoUrl?: string | null;
}

export interface CompaniesRepository {
  findById(id: string): Promise<Company | null>;
  update(id: string, data: UpdateCompanyData): Promise<Company>;
}
