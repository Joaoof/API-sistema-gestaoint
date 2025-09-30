/* eslint-disable no-unused-vars */

import { Field, ObjectType } from '@nestjs/graphql';
import { ModuleDto } from './module.dto';

@ObjectType()
export class PlanDto {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => [ModuleDto])
  modules: ModuleDto[];
}
