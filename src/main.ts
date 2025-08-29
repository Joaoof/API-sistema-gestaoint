import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { CategoriesSchemas, ProductSchemas } from './shared/swagger/utils';
import { GraphQLExceptionFilter } from './infra/filters/gql-exception.filter';

async function bootstrap() {
  console.log('JWT_SECRET:', process.env.JWT_SECRET);

  const adapter = new FastifyAdapter({ trustProxy: true });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    cors: {
      origin: [
        'https://gestaoint.netlify.app',   // ✅ Espaços removidos
        'http://localhost:5173'
      ],
      credentials: true,
      allowedHeaders: [
        'Accept',
        'Authorization',
        'Content-Type',
        'X-Requested-With',
        'x-apollo-operation-name',
      ],
      methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    }
  });

  // ✅ REGISTRE O /health IMEDIATAMENTE, ANTES DE QUALQUER OUTRA COISA
  const fastify = app.getHttpAdapter().getInstance();
  fastify.get('/health', async (request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  // ✅ Agora continue com o resto da configuração
  app.useGlobalFilters(new GraphQLExceptionFilter());

  // Swagger
  const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gestão JC - API')
    .setDescription('Documentação da API do sistema de gestão')
    .setVersion('1.0')
    .addTag('products', 'Produtos')
    .addTag('gifts', 'Presentes')
    .addTag('categories', 'Categorias')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    components: {
      schemas: {
        CreateProductDto: ProductSchemas.CreateProductDto,
        CreateCategoryDto: CategoriesSchemas.CreateCategoryDto
      },
    }
  });
  SwaggerModule.setup('api-docs', app, document);

  // Plugins
  await app.register(require('@fastify/compress'));

  // Porta principal
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
}

bootstrap();