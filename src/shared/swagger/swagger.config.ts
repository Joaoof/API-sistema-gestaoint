// shared/swagger.config.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

export function setupSwagger(app: NestFastifyApplication) {
    const config = new DocumentBuilder()
        .setTitle('Gestão JC - API')
        .setDescription('Documentação da API do sistema de gestão')
        .setVersion('1.0')
        .addTag('products', 'Produtos')
        .addTag('gifts', 'Presentes')
        .addTag('categories', 'Categorias')
        .addTag('inventory', 'Estoque')
        .build();

    const document = SwaggerModule.createDocument(app, config);

    // Deixe o NestJS cuidar do setup do Swagger com Fastify
    SwaggerModule.setup('api-docs', app, document);
}