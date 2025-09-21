import { Injectable } from "@nestjs/common";
import { User } from "src/core/entities/user.entity";
import { PlanDto } from "src/infra/graphql/dto/plan.dto";
import { UserDto } from "src/infra/graphql/dto/user.dto";

@Injectable()
export class UserDtoService {
    constructor() { }

    async buildUserDto(user: User, company: any, planDto: PlanDto): Promise<UserDto> {
        const userDto: UserDto = {
            id: user.id,
            name: user.name ?? '',
            email: user.email ?? '',
            password_hash: user.password_hash ?? '',
            role: user.role ?? '',
            company_id: user.company_id ?? '',
            createdAt: user.created_at ?? new Date(),
            company,
            plan: planDto,
            permissions: (planDto.modules || []).map((m) => ({
                module_key: m.module_key,
                permissions: m.permission,
            })),
        };
        return userDto;
    }
}