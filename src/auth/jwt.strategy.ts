import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'prisma/prisma.service';

// 🔽 Definição do payload do JWT
export interface JwtPayload {
    sub: string; // ID do usuário
    email: string;
    role: string;
    company_id: string;
}

// 🔽 Estratégia JWT para autenticação
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly prisma: PrismaService) {
        super({ 
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'seu-segredo-super-seguro',
        });
    }

    async validate(payload: JwtPayload) {
        // Aqui você pode buscar o usuário no banco para validação adicional, se necessário
        // Ou apenas retornar o payload (modo stateless)
        return { id: payload.sub, email: payload.email, role: payload.role };
    }
}