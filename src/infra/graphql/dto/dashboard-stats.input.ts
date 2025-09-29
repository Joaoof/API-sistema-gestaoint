import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DashboardStatsInput {
  @Field(() => String, { nullable: true })
  date?: string;

  @Field(() => String) // O userId geralmente é obrigatório para consultas autenticadas.
  userId: string;
}
