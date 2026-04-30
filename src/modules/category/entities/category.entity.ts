import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CategoryEntity {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field() color!: string;
  @Field() active!: boolean;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}

@ObjectType()
export class CategoryListEntity {
  @Field(() => [CategoryEntity]) items!: CategoryEntity[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
  @Field(() => Int) totalPages!: number;
}

@ObjectType()
export class DeleteCategoryResult {
  @Field() success!: boolean;
  @Field() message!: string;
}
