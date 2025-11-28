import { TaxStatus } from "@prisma/client";
import z from "zod";

export const CreateTaxExpenseSchema = z.object({
    supplier: z.string().min(5, 'Fornecedor é obrigatório.').max(255, 'Fornecedor muito longo. Máximo de 255 caracteres'),
    value: z.number().positive('O valor precisa ser um número positivo.').max(1_000_000, 'O valor não pode ultrapassar 1 milhão.'),
    description: z.string().min(1, 'Descrição é obrigatória.').max(255, 'Descrição muito longa. Máximo de 255 caracteres.'),
    dueDate: z.coerce.date().refine((d) => d >= new Date(), 'Data de vencimento não pode ser no passado.'),
    status: z.nativeEnum(TaxStatus, {
        required_error: 'O status da despesa é obrigatório.',
        invalid_type_error: 'Status inválido. Deve ser "pending", "paid" ou "overdue".',
    }),
    user_id: z.string().cuid('user_id precisa ser um UUID válido.').optional(),
})

export type CreateTaxExpenseDto = z.infer<typeof CreateTaxExpenseSchema>;