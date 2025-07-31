import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ModuleDto {
  @Field(() => String)
  module_key: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => [String])
  permission: string[];

  @Field(() => Boolean)
  isActive: boolean;
}