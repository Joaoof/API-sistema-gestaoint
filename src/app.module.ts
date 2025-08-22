import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ProductModule } from './modules/product/product.module';
import { CategoryModule } from './modules/category/category.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SupplierModule } from './modules/supplier/supplier.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import { GqlThrottlerGuard } from './shared/guards/gql-throttler.guard';
import { GqlCacheInterceptor } from './shared/guards/gql-cache-interceptor.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { QueuesModule } from './infra/queues/queue.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { GraphQLExceptionFilter } from './infra/filters/gql-exception.filter';
import { CompanyModule } from './modules/company/company.module';
import { CashMovementModule } from './modules/cashMovement/cash-movement.module';
import { RedisModule } from './infra/cache/redis.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/infra/graphql/schema.gql'),
      sortSchema: true,
      debug: true,
      server: {
        // landingPageDisabled: true,
        csrfPrevention: false // 👈 Desativa a proteção  

      },
      context: ({ request, reply }: { request: any; reply: any }) => ({
        req: request,
        reply,
        user: request?.user, // <- aqui, com "safe access"
      }),
    }),
    CacheModule.register({
      ttl: 60, // segundos
      max: 100, // número máximo de itens no cache
      isGlobal: true, // torna acessível em toda a aplicação
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100
    }]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        username: process.env.REDIS_USERNAME,   // opcional
        password: process.env.REDIS_PASSWORD,
      },
    }),


    BullModule.registerQueue({
      name: 'email',
    }),
    ProductModule,
    CategoryModule,
    SupplierModule,
    QueuesModule,
    UserModule,
    AuthModule,
    CompanyModule,
    CashMovementModule,
  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard, // Aqui usa o guard customizado
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: GqlCacheInterceptor
    },
    {
      provide: APP_FILTER,
      useClass: GraphQLExceptionFilter,
    },
  ],
})
export class AppModule { }
