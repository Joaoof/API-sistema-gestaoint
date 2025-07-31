import { Field, ObjectType } from '@nestjs/graphql';
import { UserDto } from './user.dto';
import { CompanyDto } from './company.dto';
import { PlanDto } from './plan.dto';
import { ModuleDto } from './module.dto';

@ObjectType()
export class AuthPayload {
    @Field(() => String)
    accessToken: string;

    @Field(() => String)
    expiresIn: string;

    @Field(() => UserDto)
    user: UserDto;

    @Field(() => CompanyDto)
    company: CompanyDto;

    @Field(() => PlanDto, { nullable: true })
    plan?: PlanDto;

    @Field(() => ModuleDto, { nullable: true })
    module?: ModuleDto;
}