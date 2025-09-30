// src/modules/supplier/dtos/create-supplier.dto.ts

import { z } from 'zod';

export const CreateSupplierSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string',
  }),
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .email('Invalid email format'),
  phone: z.string({
    required_error: 'Phone is required',
    invalid_type_error: 'Phone must be a string',
  }),
  address: z.string({
    required_error: 'Address is required',
    invalid_type_error: 'Address must be a string',
  }),
  // Adicione outros campos se precisar, ex:
  // cnpj: z.string().optional(),
});

export type CreateSupplierDto = z.infer<typeof CreateSupplierSchema>;
