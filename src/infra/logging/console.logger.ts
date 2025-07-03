// src/infra/logging/console.logger.ts

import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/core/ports/logger.service';

@Injectable()
export class ConsoleLogger implements LoggerService {
    log(message: string): void {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
    }

    warn(message: string): void {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    }

    error(message: string, stack?: string): void {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
        if (stack) {
            console.error(stack);
        }
    }
}