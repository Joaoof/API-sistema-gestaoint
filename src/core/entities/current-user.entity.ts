/* eslint-disable no-unused-vars */

import { PermissionDto } from '../../infra/graphql/dto/permission.dto';
import { PlanDto } from '../../infra/graphql/dto/plan.dto';

export class CurrentUserDto {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public role: string,
    public companyId: string,
    public isActive: boolean,
    public createdAt: Date,
    public plan: PlanDto,
    public permissions: PermissionDto[],
  ) {}
}
