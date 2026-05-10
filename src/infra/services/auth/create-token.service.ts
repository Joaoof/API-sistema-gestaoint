import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { User } from 'src/core/entities/user.entity';

@Injectable()
export class CreateTokenService {
  private readonly jwtService: JwtService;
  constructor(jwtService: JwtService) {
    this.jwtService = jwtService;
  }

  async isCreated(
    user: User,
  ): Promise<{ expiresIn: string; accessToken: string }> {
    // ✅ Otimizado
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isSuperAdmin: (user as any).isSuperAdmin === true,
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET não está definido!');
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN || '3600s') as StringValue;

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn,
    });

    return {
      accessToken,
      expiresIn,
    };
  }
}
