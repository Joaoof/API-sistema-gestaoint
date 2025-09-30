import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
