import { z } from "zod";

export const LoginUserSchema = z.object({
    email: z.string().email('Email inválido'),
    password_hash: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export type LoginUserDto = z.infer<typeof LoginUserSchema>;