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

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }), // garante que process.env funciona
        UserModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        RedisModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET') || 'secreto_super_forte', // fallback
                signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '1d' },
            }),
        }),
    ],
    providers: [
        AuthResolver,
        AuthService,
        PrismaService,
        JwtStrategy,
    ],
    exports: [AuthService],
})
export class AuthModule { }
