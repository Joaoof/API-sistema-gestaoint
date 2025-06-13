import { z } from 'zod';

export const CreateGiftSchema = z.object({
  name: z.string().min(3),
  description: z.string(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional(),
});

export type CreateGiftDto = z.infer<typeof CreateGiftSchema>;