// src/shared/swagger/utils.ts
import { CreateProductSchema } from 'src/core/use-cases/dtos/create-product.core-dto';
import { CreateCategorySchema } from 'src/core/use-cases/dtos/create-category.core-dto';
// import { toOpenApi } from '@anatine/zod-openapi';
import { generateSchema } from '@anatine/zod-openapi';
export const ProductSchemas = {
  CreateProductDto: generateSchema(CreateProductSchema),
};

export const CategoriesSchemas = {
  CreateCategoryDto: generateSchema(CreateCategorySchema),
};
