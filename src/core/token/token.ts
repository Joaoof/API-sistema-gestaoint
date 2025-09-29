// src/core/tokens.ts

import { InjectionToken } from '@nestjs/common';
import { LoggerService } from 'src/core/ports/logger.service';

export const LOGGER_SERVICE = 'LoggerService' as const;
