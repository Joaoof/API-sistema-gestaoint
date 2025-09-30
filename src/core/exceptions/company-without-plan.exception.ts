import { BaseError } from './base.exception';

export class CompanyWithoutPlanError extends BaseError {
  constructor() {
    super('Empresa sem plano ativo', 'COMPANY_WITHOUT_PLAN', 403);
  }
}
