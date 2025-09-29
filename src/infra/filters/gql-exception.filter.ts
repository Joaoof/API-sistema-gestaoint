import {
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApolloError } from 'apollo-server-express';
import { BaseError } from 'src/core/exceptions/base.exception';
import { DomainValidationError } from 'src/core/exceptions/domain.exception';
import { ZodError } from 'zod';

@Catch()
export class GraphQLExceptionFilter implements ExceptionFilter {
  catch(exception: any) {
    if (exception instanceof ZodError) {
      const message = exception.errors.map((err) => err.message).join(', ');
      return new ApolloError(message, 'VALIDATION_ERROR', {
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // 2. Erros customizados (BaseError)
    if (exception instanceof BaseError) {
      return new ApolloError(
        exception.message,
        exception.code || 'BASE_ERROR',
        { statusCode: exception.statusCode || HttpStatus.BAD_REQUEST },
      );
    }

    // 3. DomainValidationError
    if (exception instanceof DomainValidationError) {
      console.log('📢 DomainValidationError capturado:', exception.errors);
      return new ApolloError('Validation failed', 'DOMAIN_VALIDATION_ERROR', {
        errors: exception.errors, // somente se a classe tiver public readonly errors
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // 4. HttpException padrão (ex: UnauthorizedException)
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();
      const message =
        typeof response === 'object' && response !== null
          ? (response as any).message || exception.message
          : exception.message;
      const code = (response as any)?.code || exception.constructor.name;

      return new ApolloError(message, code, { statusCode: status });
    }

    // 5. Qualquer outro erro não esperado
    console.error('❌ Erro não tratado:', exception);
    return new ApolloError('Erro interno', 'INTERNAL_SERVER_ERROR', {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
