import { Field, ObjectType } from '@nestjs/graphql';
import { CompanyDto } from './company.dto';
import { PlanDto } from './plan.dto';
import { PermissionDto } from './permission.dto';

@ObjectType()
export class UserDto {
    @Field(() => String)
    id: string;

    @Field(() => String)
    email: string;

    @Field(() => String)
    password_hash: string;

    @Field(() => String)
    name: string;

    @Field(() => String)
    role: string;

    @Field(() => String)
    company_id: string;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => CompanyDto)
    company: CompanyDto;

    @Field(() => PlanDto, { nullable: true })
    plan?: PlanDto;

    @Field(() => [PermissionDto], { nullable: 'items' }) // ✅ Correto
    permissions: PermissionDto[];
}