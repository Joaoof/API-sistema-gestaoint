// src/shared/validations/gift.schema.ts
import { z } from 'zod';

export const GiftSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    price: z.number().min(0, 'Preço deve ser positivo'),
    imageUrl: z.string().url('URL inválida').optional(),
    status: z.enum(['available', 'reserved']).optional(),
    createdAt: z.coerce.date().optional()
});

export type GiftInput = z.infer<typeof GiftSchema>;
