import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import compression from '@fastify/compress';

async function bootstrap() {
  const adapter = new FastifyAdapter();
  adapter.register(compression as any);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, { cors: true });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
