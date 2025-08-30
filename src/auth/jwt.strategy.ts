import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'prisma/prisma.service';

// 🔽 Definição do payload do JWT
export interface JwtPayload {
    sub: string; // ID do usuário
    name: string;
    email: string;
    password_hash: string;
    role: string;
    company_id: string;
}

// 🔽 Estratégia JWT para autenticação
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly prisma: PrismaService) {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is not defined');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET, // Certifique-se de definir JWT_SECRET no seu .env
        });
    }

    async validate(payload: JwtPayload) {
        console.log('🔐 [JwtStrategy] Payload recebido:', payload);
        // Aqui você pode buscar o usuário no banco para validação adicional, se necessário
        // Ou apenas retornar o payload (modo stateless)
        return { id: payload.sub, name: payload.name, email: payload.email, role: payload.role };
    }
}