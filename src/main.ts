// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { CategoriesSchemas, ProductSchemas } from './shared/swagger/utils';
import * as compression from 'compression';
import { readFileSync } from 'fs';
import { join } from 'path';


async function bootstrap() {

  const httpOptions = {
    http2: true,
    https: {
      key: readFileSync(join(__dirname, '..', 'secrets', 'localhost.key')),
      cert: readFileSync(join(__dirname, '..', 'secrets', 'localhost.crt')),
    }
  }

  const adapter = new FastifyAdapter(httpOptions);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    cors: true,
  });

  // Configuração padrão do Swagger
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
        // Adicione aqui os schemas convertidos
        CreateProductDto: ProductSchemas.CreateProductDto,
        CreateCategoryDto: CategoriesSchemas.CreateCategoryDto
      },
    }
  });
  SwaggerModule.setup('api-docs', app, document);

  app.use(compression())

  await app.listen(3000);
}

bootstrap();