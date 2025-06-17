// src/shared/swagger/utils.ts
import { CreateProductSchema } from 'src/modules/product/dtos/create-product.dto';
// import { toOpenApi } from '@anatine/zod-openapi';
import { generateSchema } from '@anatine/zod-openapi';
export const ProductSchemas = {
    CreateProductDto: generateSchema(CreateProductSchema),
};