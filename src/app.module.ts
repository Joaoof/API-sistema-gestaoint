import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ProductModule } from './modules/product/product.module';
import { CategoryModule } from './modules/category/category.module';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/infra/graphql/schema.gql'),
      sortSchema: true,
      debug: true,
      server: {
        landingPageDisabled: true,
      },
      context: ({ req, reply }) => ({ req, reply })
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
        host: 'viable-ewe-10712.upstash.io',
        port: 6379,
        username: 'default',
        password: 'ASnYAAIjcDFjNzYxYzM0NTEwNmI0YjdkYjZjYmM5N2QxNWJjNWRjMHAxMA',
        tls: {}, // Upstash exige TLS
      },
    }),

    BullModule.registerQueue({
      name: 'email',
    }),
    ProductModule,
    CategoryModule
  ],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: ThrottlerGuard
  }],
})
export class AppModule { }
