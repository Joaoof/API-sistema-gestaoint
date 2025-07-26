import { CreateProductDto } from "src/modules/product/dtos/create-product.dto";

export class CreateProductCommand {
    constructor(public readonly dto: CreateProductDto) { }
}