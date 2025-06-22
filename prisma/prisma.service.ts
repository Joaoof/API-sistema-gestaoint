import { INestApplication, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient implements OnModuleInit {
    async onModuleInit() {
        await this.$connect();

        this.$on(   , (e: { query: string; params: string; duration: number; target: string }) => {
            if (e.duration >= 100) {
                console.warn(`Query lenta: ${e.query} | Tempo: ${e.duration}ms`);
            }
        });
    }

    async enableShutdownHooks(app: INestApplication) {
        this.$on('beforeExit', async () => {
            await app.close();
        });
    }
}