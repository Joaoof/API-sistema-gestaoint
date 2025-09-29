import { Field, ObjectType } from '@nestjs/graphql';
import { User } from 'src/core/entities/user.entity';
import { PermissionDto } from 'src/infra/graphql/dto/permission.dto'; // ✅ Importe correto
import { PlanDto } from 'src/infra/graphql/dto/plan.dto';

@ObjectType()
export class UserResponseDto {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  email: string;

  @Field(() => String, { nullable: true })
  company_id?: string;

  @Field(() => String)
  role: string;

  @Field(() => Boolean)
  is_active: boolean;

  @Field(() => [PermissionDto], { nullable: 'items' })
  permissions: PermissionDto[];

  // ✅ ADICIONE A LINHA ABAIXO
  @Field(() => PlanDto, { nullable: true })
  plan?: PlanDto;

  static fromDomain(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.name = user.name ?? '';
    dto.email = user.email ?? '';
    dto.role = user.role ?? '';
    dto.company_id = user.company_id;
    dto.is_active = user.is_active ?? true;
    dto.permissions = []; // será preenchido no resolver
    dto.plan = undefined; // será preenchido no resolver
    return dto;
  }
}
