import { HttpException, HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "src/auth/jwt.strategy";
import { User } from "src/core/entities/user.entity";

export class CreateTokenService {
    constructor(private readonly jwtService: JwtService) { }

    async isCreated(user: User): Promise<{ expiresIn: string; accessToken: string; }> {
        const payload: JwtPayload = {
            sub: user.id,
            name: user.name ?? '',
            email: user.email ?? '',
            role: user.role ?? '',
            company_id: user.company_id ?? '',
        };

        console.log('Payload do JWT:', payload);

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('❌ JWT_SECRET não está definido!');
            throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
        });


        console.log('Access Token gerado:', accessToken);

        return {
            accessToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
        };
    }

}