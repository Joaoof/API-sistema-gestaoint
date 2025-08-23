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


@Module({
    imports: [
        UserModule, // onde está seu findById ou findByEmail
        PassportModule,
        RedisModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'secreto',
            signOptions: { expiresIn: '1d' },
        }),
    ],
    providers: [
        AuthResolver,
        AuthService,
        PrismaService,
        JwtStrategy
    ],
    exports: [AuthService],
})
export class AuthModule { }
