// src/core/core.module.ts

import { Module, Global } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ConsoleLogger } from 'src/infra/logging/console.logger';
import { LoggerService } from 'src/core/ports/logger.service';

@Global()
@Module({
    providers: [
        {
            provide: 'LoggerService',
            useClass: ConsoleLogger,
        },
        PrismaService,
    ],
    exports: ['LoggerService', PrismaService],
})
export class CoreModule {}