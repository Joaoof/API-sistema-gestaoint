// src/infra/http/validators/create-entry-movement.schema.ts
import { z } from 'zod'
import { EntryTypeClient } from '@prisma/client'

export const CreateEntryMovementSchema = z.object({
    user_id: z.string(),
    typeEntry: z.nativeEnum(EntryTypeClient, {
        required_error: 'O tipo de entrada é obrigatório',
        invalid_type_error: 'Tipo de entrada inválido',
    }),
    value: z.number().positive('O valor precisa ser positivo'),
    description: z.string().min(1, 'Descrição é obrigatória'),
})

export type CreateEntryMovementDto = z.infer<typeof CreateEntryMovementSchema>
