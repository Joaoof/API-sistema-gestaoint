import { CreateProductInput } from "src/infra/graphql/resolvers/product.resolver";

export class CreateProductCommand {
    constructor(public readonly dto: CreateProductInput, public readonly userId: string, // ✅ Agora o userId é um parâmetro separado
    ) { }
}