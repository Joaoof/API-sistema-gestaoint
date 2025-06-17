// src/modules/product/dtos/create-product.dto.ts
import { z } from 'zod';

export const CreateProductSchema = z.object({
    name: z.string().min(3),
    description: z.string().optional(),
    price: z.number().positive(),
    categoryId: z.string(),
    supplierId: z.string(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;