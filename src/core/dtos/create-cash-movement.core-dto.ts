import { z } from 'zod';
import {
  MovementCategory,
  MovementStatus,
  MovementType,
  MovementTypePayment,
} from '@prisma/client';

const optionalTrimmedString = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} muito longo. Máximo de ${max} caracteres.`)
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null));

export const CreateCashMovementSchema = z
  .object({
    type: z.nativeEnum(MovementType, {
      required_error: 'O tipo (entrada ou saída) é obrigatório.',
      invalid_type_error: 'Tipo inválido. Deve ser ENTRY ou EXIT.',
    }),
    category: z.nativeEnum(MovementCategory, {
      required_error: 'A categoria da movimentação é obrigatória.',
      invalid_type_error: 'Categoria inválida.',
    }),
    typePayment: z
      .nativeEnum(MovementTypePayment, {
        invalid_type_error: 'Forma de pagamento inválida.',
      })
      .optional()
      .nullable(),
    status: z
      .nativeEnum(MovementStatus, { invalid_type_error: 'Status inválido.' })
      .optional()
      .default(MovementStatus.COMPLETED),
    value: z
      .number({
        required_error: 'O valor é obrigatório.',
        invalid_type_error: 'O valor deve ser numérico.',
      })
      .positive('O valor precisa ser um número positivo.')
      .max(1_000_000, 'O valor não pode ultrapassar 1 milhão.'),
    description: z
      .string({ required_error: 'Descrição é obrigatória.' })
      .min(1, 'Descrição é obrigatória.')
      .max(255, 'Descrição muito longa. Máximo de 255 caracteres.'),
    date: z.coerce
      .date()
      .optional()
      .default(() => new Date()),
    dueDate: z.coerce.date().optional().nullable(),
    paidAt: z.coerce.date().optional().nullable(),
    referenceCode: optionalTrimmedString(60, 'Código de referência'),
    counterpartyName: optionalTrimmedString(120, 'Nome do contato'),
    counterpartyDocument: optionalTrimmedString(20, 'Documento'),
    notes: optionalTrimmedString(2000, 'Observações'),
    attachmentUrl: z
      .string()
      .url('URL do anexo inválida.')
      .max(500)
      .optional()
      .nullable(),
    // O backend usa cuid() para Users.id (não UUID), por isso aceitamos
    // qualquer string não vazia. A autenticidade do user_id é garantida pelo
    // JWT/CurrentUser, então não precisamos validar formato aqui.
    user_id: z.string().min(1, 'user_id é obrigatório.').optional(),
    bankId: z.string().min(1, 'bankId inválido.').optional().nullable(),
  })
  .refine((d) => !d.date || d.date <= new Date(), {
    message: 'Data não pode ser no futuro.',
    path: ['date'],
  })
  .refine(
    (d) =>
      !d.dueDate ||
      !d.date ||
      d.dueDate.getTime() >= new Date(d.date).setHours(0, 0, 0, 0),
    { message: 'Vencimento não pode ser anterior à data.', path: ['dueDate'] },
  );

export type CreateCashMovementDto = z.input<typeof CreateCashMovementSchema>;
export type CreateCashMovementParsed = z.output<
  typeof CreateCashMovementSchema
>;
