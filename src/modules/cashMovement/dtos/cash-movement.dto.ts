import { z } from 'zod';
import { MovementType, MovementCategory } from '@prisma/client';

export const CreateCashMovementSchema = z.object({
    type: z.nativeEnum(MovementType, {
        required_error: 'O tipo (entrada ou saída) é obrigatório.',
        invalid_type_error: 'Tipo inválido.',
    }),
    category: z.nativeEnum(MovementCategory, {
        required_error: 'A categoria da movimentação é obrigatória.',
        invalid_type_error: 'Categoria inválida.',
    }),
    value: z.number()
        .positive('O valor precisa ser um número positivo.'),
    description: z.string()
        .min(1, 'Descrição é obrigatória.'),
    date: z.coerce.date().optional().default(() => new Date()),
    user_id: z.string().optional(),
});

export type CreateCashMovementDto = z.infer<typeof CreateCashMovementSchema>;
