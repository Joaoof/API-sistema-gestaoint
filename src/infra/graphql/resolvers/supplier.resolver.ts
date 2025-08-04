import { Resolver, Query, Mutation, Args, ID, InputType, Field, ObjectType } from '@nestjs/graphql';
import { Supplier } from 'src/core/entities/supplier.entity';
import { FindAllSupplierUseCase } from 'src/core/use-cases/supplier/find-all-supplieres.use-case';

@ObjectType()
export class SupplierOutput {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;
}


@Resolver(() => Supplier)
export class SupplierResolver {
    constructor(private readonly findAllUseCase: FindAllSupplierUseCase) { }

    @Query(() => [SupplierOutput])
    async suppliers() {
        return this.findAllUseCase.execute();
    }

}
