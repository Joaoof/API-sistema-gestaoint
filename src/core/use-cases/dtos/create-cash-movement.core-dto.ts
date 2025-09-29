import { z } from 'zod';
import { MovementType, MovementCategory } from '@prisma/client';

// Validação avançada de DTO
export const CreateCashMovementSchema = z.object({
  type: z.nativeEnum(MovementType, {
    required_error: 'O tipo (entrada ou saída) é obrigatório.',
    invalid_type_error: 'Tipo inválido. Deve ser "income" ou "expense".',
  }),
  category: z.nativeEnum(MovementCategory, {
    required_error: 'A categoria da movimentação é obrigatória.',
    invalid_type_error: 'Categoria inválida.',
  }),
  value: z
    .number()
    .positive('O valor precisa ser um número positivo.')
    .max(1_000_000, 'O valor não pode ultrapassar 1 milhão.'), // limite máximo
  description: z
    .string()
    .min(1, 'Descrição é obrigatória.')
    .max(255, 'Descrição muito longa. Máximo de 255 caracteres.'),
  date: z.coerce
    .date()
    .refine((d) => d <= new Date(), 'Data não pode ser no futuro.') // regra de negócio
    .optional()
    .default(() => new Date()),
  user_id: z.string().uuid('user_id precisa ser um UUID válido.').optional(),
});

export type CreateCashMovementDto = z.infer<typeof CreateCashMovementSchema>;
