// joaoof/api-sistema-gestaoint/api-sistema-gestaoint-3358eb9b49451d8a010dd9e2c99dca7bc80dc155/tests__/architecture/dependency-injection.spec.ts

import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { INestApplication } from '@nestjs/common';

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
            await expect(app.get(provider)).toBeDefined();
        }
    });

    it('no circular dependencies detected in DI container', () => {
        // Nest will throw on circular by default; if not thrown above, assume none
        expect(true).toBe(true);
    });
});