import { create } from "domain";
import { z } from "zod";

export const CreateUserSchema = z.object({
    email: z.string().email().min(3, "O nome de usuário deve ter pelo menos 3 caracteres"),
    password_hash: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    name: z.string().min(3),
    company_id: z.string().uuid("ID da empresa inválido"),
    role: z.enum(["admin", "user"]).default("user"),
    is_active: z.boolean().default(true),
    createdAt: z.date().optional(),
})

export type CreateUserDto = z.infer<typeof CreateUserSchema>