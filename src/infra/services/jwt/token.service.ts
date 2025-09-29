// src/infra/services/jwt/token.service.ts
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth/auth.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtPayload } from 'src/auth/jwt.strategy';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly authService: AuthService;

  constructor(authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey:
        process.env.SECRETKEYm ??
        (() => {
          throw new Error('SECRETKEYm env not set');
        })(),
    });
    this.authService = authService;
  }

  async validate(payload: JwtPayload): Promise<any> {
    const user = await this.authService.login(payload);
    if (!user) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
    return user;
  }
}
