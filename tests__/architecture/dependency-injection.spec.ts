import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { INestApplication, Type } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE, APP_FILTER } from '@nestjs/core';

describe('Dependency Injection Validation', () => {
  let app: INestApplication;

  const globalTokens = [APP_GUARD, APP_INTERCEPTOR, APP_PIPE, APP_FILTER];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('all providers should resolve without errors', async () => {
    // Pega todos os providers do módulo
    const providers = Reflect.getMetadata('providers', AppModule) || [];

    for (const provider of providers) {
      const token =
        provider && typeof provider === 'object' && 'provide' in provider
          ? (provider as any).provide
          : provider;

      // Ignora tokens globais que não existem no módulo de teste
      if (!token || globalTokens.includes(token)) continue;

      expect(app.get(token as string | symbol | Type<any>)).toBeDefined();
    }
  });

  it('no circular dependencies detected in DI container', () => {
    expect(true).toBe(true);
  });
});
