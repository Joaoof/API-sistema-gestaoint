import { z } from 'zod';

export const DashboardMovementSchema = z.object({
  userId: z
    .string({
      required_error: 'Usuário é obrigatório.',
      invalid_type_error: 'Usuário inválido.',
    }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .transform((val) => val ?? new Date().toISOString().split('T')[0]),
});

export type DashboardMovementInput = z.infer<typeof DashboardMovementSchema>;
0;
