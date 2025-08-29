import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { CategoriesSchemas, ProductSchemas } from './shared/swagger/utils';
import { GraphQLExceptionFilter } from './infra/filters/gql-exception.filter';
import { config } from 'dotenv';
import { createServer } from 'http';

async function bootstrap() {
  config();
  console.log('JWT_SECRET:', process.env.JWT_SECRET); // 🔍 Veja se aparece

  const adapter = new FastifyAdapter({ trustProxy: true });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    cors: {
      origin: ['https://gestaoint.netlify.app',   // ✅ Sem espaços
        'http://localhost:5173'], // ✅ Domínio específico
      credentials: true,
      allowedHeaders: [
        'Accept',
        'Authorization',
        'Content-Type',
        'X-Requested-With',
        'x-apollo-operation-name', // ✅ Adicione este (mais comum que apollo-require-preflight)
      ],
      methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    }
  });

  const healthServer = createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }).listen(Number(process.env.PORT), '0.0.0.0'); // Escuta em 0.0.0.0 para ser acessível externamente

  console.log(`✅ Health check server running on http://0.0.0.0:${process.env.PORT}/health`);

  app.useGlobalFilters(new GraphQLExceptionFilter());


  // Swagger setup (sem alterações aqui)
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

  // Registra os plugins Fastify em vez de usar app.use()
  await app.register(require('@fastify/compress'));
  // await app.register(require('@fastify/helmet'), {
  //   contentSecurityPolicy: {
  //     directives: {
  //       defaultSrc: ["'self'"],
  //       imgSrc: [
  //         "'self'",
  //         "data:",
  //         "https://cdn.jsdelivr.net",
  //         "https://cdn.apollographql.com"
  //       ],
  //       scriptSrc: [
  //         "'self'",
  //         "https://cdn.jsdelivr.net",
  //         "https://cdn.apollographql.com",
  //         "'unsafe-inline'"
  //       ],
  //       styleSrc: [
  //         "'self'",
  //         "'unsafe-inline'",
  //         "https://cdn.jsdelivr.net",
  //         "https://fonts.googleapis.com"
  //       ],
  //       fontSrc: [
  //         "'self'",
  //         "https://fonts.gstatic.com"
  //       ],
  //       connectSrc: [
  //         "'self'",
  //         "https://jc-production-6a4c.up.railway.app", // ✅ Sem espaço
  //         "https://*.up.railway.app"
  //       ],
  //       frameSrc: [
  //         "'self'",
  //         "https://studio.apollographql.com" // ✅ Sem espaço
  //       ],
  //     },
  //   },
  //   crossOriginResourcePolicy: false, // opcional, se usar iframe
  // });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // importante: '0.0.0.0', não 'localhost'
  console.log(`🚀 Server running on port ${port}`);

}


bootstrap();
