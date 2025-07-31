import { CreateProductDto } from "src/modules/product/dtos/create-product.dto";

export class CreateProductCommand {
    constructor(public readonly dto: CreateProductDto, public readonly userId: string, // ✅ Agora o userId é um parâmetro separado
    ) { }
}