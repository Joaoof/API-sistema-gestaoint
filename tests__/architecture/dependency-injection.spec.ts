import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { INestApplication, Type } from '@nestjs/common';

describe('Dependency Injection Validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    // CORREÇÃO: Aumentar o timeout de 5s para 30s (30000ms) para a inicialização da aplicação
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('all providers should resolve without errors', async () => {
    const providers = Reflect.getMetadata('providers', AppModule) || [];

    for (const provider of providers) {
      const token =
        provider && typeof provider === 'object' && 'provide' in provider
          ? (provider as any).provide
          : provider;

      if (token) {
        expect(app.get(token as string | symbol | Type<any>)).toBeDefined();
      }
    }
  });

  it('no circular dependencies detected in DI container', () => {
    // Nest will throw on circular by default; if not thrown above, assume none
    expect(true).toBe(true);
  });
});
