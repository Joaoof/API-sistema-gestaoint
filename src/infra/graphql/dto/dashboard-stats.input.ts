import { Field, InputType, ObjectType } from "@nestjs/graphql";

@InputType()
export class DashboardStatsInput {
    @Field(() => String, { nullable: true })
    date?: string;

    // ADICIONE ESTE CAMPO:
    @Field(() => String) // O userId geralmente é obrigatório para consultas autenticadas.
    userId: string;
}