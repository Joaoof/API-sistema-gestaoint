import { Company } from '../entities/company.entity';

export interface CompaniesRepository {
    findById(id: string): Promise<Company | null>;
    // outras operações...
}
