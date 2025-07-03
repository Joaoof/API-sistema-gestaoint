// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { CategoriesSchemas, ProductSchemas } from './shared/swagger/utils';
import { CreateCategorySchema } from './modules/category/dtos/create-category.dto';
import * as compression from 'compression';
import helmet from 'helmet';


async function bootstrap() {
  const adapter = new FastifyAdapter();
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
  app.use(helmet());

  await app.listen(3000);
}

bootstrap();