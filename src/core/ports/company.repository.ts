/* eslint-disable no-unused-vars */

import { Company } from '../entities/company.entity';

export interface UpdateCompanyData {
  name?: string;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  inscricaoEstadual?: string | null;
  cidade?: string | null;
  estado?: string | null;
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
