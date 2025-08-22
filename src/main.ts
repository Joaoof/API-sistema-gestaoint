import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { CategoriesSchemas, ProductSchemas } from './shared/swagger/utils';
import { GraphQLExceptionFilter } from './infra/filters/gql-exception.filter';

async function bootstrap() {
  const adapter = new FastifyAdapter({ trustProxy: true });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    cors: {
      origin: '*',
    }
  });
  app.useGlobalFilters(new GraphQLExceptionFilter());


  // Swagger setup (sem alterações aqui)
  const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
  const config = new DocumentBuilder()
    .setTitle('Gestão JC - API')
    .setDescription('Documentação da API do sistema de gestão')
    .setVersion('1.0')
    .addTag('products', 'Produtos')
    .addTag('gifts', 'Presentes')
    .addTag('categories', 'Categorias')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    components: {
      schemas: {
        CreateProductDto: ProductSchemas.CreateProductDto,
        CreateCategoryDto: CategoriesSchemas.CreateCategoryDto
      },
    }
  });
  SwaggerModule.setup('api-docs', app, document);

  // Registra os plugins Fastify em vez de usar app.use()
  await app.register(require('@fastify/compress'));
  await app.register(require('@fastify/helmet'));


  // Para adicionar headers customizados:
  const fastifyInstance = app.getHttpAdapter().getInstance();

  fastifyInstance.addHook('onSend', async (request, reply, payload) => {
    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "img-src 'self' data: http://cdn.jsdelivr.net http://cdn.apollographql.com; " +
      "script-src 'self' http://cdn.jsdelivr.net http://cdn.apollographql.com 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' http://cdn.jsdelivr.net http://fonts.googleapis.com; " +
      "font-src 'self' http://fonts.gstatic.com;"
    );

    return payload;
  });



  app.use((req, res, next) => {
    console.log('Middleware req.ip:', req.ip);
    console.log('Middleware res.header?', typeof res.header);
    next();
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // importante: '0.0.0.0', não 'localhost'
  console.log(`🚀 Server running on port ${port}`);

}

bootstrap();
