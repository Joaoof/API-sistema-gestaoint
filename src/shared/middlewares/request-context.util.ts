import { Injectable, NestMiddleware } from '@nestjs/common';
import { als } from '../utils/request-context.util';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    use(req: any, res: any, next: () => void) {
        const requestId = Math.random().toString(36).substring(7);
        als.run({ requestId }, () => {
            console.log(`[${requestId}] ${req.method} ${req.url}`);
            next();
        });
    }
}