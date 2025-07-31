import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth/auth.service';
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { JwtPayload } from 'src/auth/jwt.strategy';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

    constructor(private readonly authService: AuthService) {
        const secretKey = process.env.SECRETKEYm;
        if (!secretKey) {
            throw new Error('SECRETKEYm environment variable is not set');
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: true,
            secretOrKey: secretKey
        });
    }

    async validate(payload: JwtPayload): Promise<any> {
        const user = await this.authService.validateUser(payload);
        if (!user) {
            throw new HttpException('Invalid token',
                HttpStatus.UNAUTHORIZED);
        }
        return user;
    }

}