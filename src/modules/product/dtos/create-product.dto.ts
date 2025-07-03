// src/modules/product/dtos/create-product.dto.ts
import { z } from 'zod';

export const CreateProductSchema = z.object({
    nameProduct: z.string().min(3),
    categoryName: z.string().optional(),
    quantity: z.number().int().nonnegative().default(0),
    costPrice: z.number().positive().default(0),
    salePrice: z.number().positive().default(0),
    supplierName: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;