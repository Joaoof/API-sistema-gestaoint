import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { BaseError } from 'src/core/exceptions/base.exception';
import { DomainValidationError } from 'src/core/exceptions/domain.exception';

@Catch()
export class GraphQLExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const gqlHost = GqlArgumentsHost.create(host);

        // 🔥 LOG PARA DEBUG: veja SEU ERRO CHEGA AQUI
        console.log('🎯 Erro capturado no filtro:', {
            message: exception.message,
            name: exception.name,
            code: (exception as any).code,
            statusCode: (exception as any).statusCode,
            instanceOfBaseError: exception instanceof BaseError,
            constructor: exception.constructor.name,
        });

        // 1. Erros customizados (BaseError)
        if (exception instanceof BaseError) {
            return new ApolloError(
                exception.message,   // 👈 "E-mail ou senha incorretos"
                exception.code,      // 👈 "INVALID_CREDENTIALS"
                { statusCode: exception.statusCode }
            );
        }

        if (exception instanceof DomainValidationError) {
            console.log('📢 DomainValidationError capturado:', {
                errors: exception.errors,
                hasErrors: Array.isArray(exception.errors),
                length: exception.errors?.length,
            });

            return new ApolloError(
                'Validation failed',
                'DOMAIN_VALIDATION_ERROR',
                {
                    errors: exception.errors, // ✅ só existe se a classe tiver `public readonly errors`
                    statusCode: HttpStatus.BAD_REQUEST,
                }
            );
        }

        // 3. HttpException padrão (ex: UnauthorizedException)
        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            const status = exception.getStatus();

            const message = typeof response === 'object' && response !== null
                ? (response as any).message || exception.message
                : exception.message;

            const code = (response as any)?.code || exception.constructor.name;

            return new ApolloError(message, code, { statusCode: status });
        }

        // 4. Qualquer outro erro não esperado
        console.error('❌ Erro não tratado:', exception);
        return new ApolloError(
            'Erro interno',
            'InternalServerError',
            { statusCode: 500 }
        );
    }
}