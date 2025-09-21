// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from 'src/infra/services/auth/auth.service';
import { AuthResolver } from 'src/infra/graphql/resolvers/auth.resolver';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { PrismaService } from 'prisma/prisma.service';
import { RedisModule } from 'src/infra/cache/redis.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GetByIdUserService } from 'src/infra/services/auth/get-by-id.service';

@Module({
    imports: [
        UserModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        RedisModule,
        JwtModule.registerAsync({
            imports: [ConfigModule], // ✅ isso está certo (para injeção)
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET'), // ✅ Busca a variável de ambiente
                signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '1d' },
            }),
        }),
    ],
    providers: [AuthService, AuthResolver, JwtStrategy, PrismaService, GetByIdUserService],
    exports: [AuthService],
})
export class AuthModule { }
