import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CompanyDto {
    @Field(() => String)
    id: string;

    @Field(() => String, { nullable: true })
    name?: string;


    @Field(() => String, { nullable: true })
    email?: string;

    @Field(() => String, { nullable: true })
    phone?: string;

    @Field(() => String, { nullable: true })
    address?: string;

    @Field(() => String, { nullable: true })
    logoUrl?: string; // ✅ Adicione aqui
}