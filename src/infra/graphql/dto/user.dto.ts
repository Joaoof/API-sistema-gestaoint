import { Field, ObjectType } from '@nestjs/graphql';
import { CompanyDto } from './company.dto';
import { PlanDto } from './plan.dto';

@ObjectType()
export class UserDto {
    @Field(() => String)
    id: string;

    @Field(() => String)
    email: string;

    @Field(() => String, { nullable: true })
    name?: string;

    @Field(() => String)
    role: string;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => String)
    company_id: string;

    @Field(() => CompanyDto)
    company: CompanyDto;

    @Field(() => PlanDto, { nullable: true })
    plan?: PlanDto;
}