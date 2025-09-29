import { BaseError } from './base.exception';
import { HttpStatus } from '@nestjs/common';

export class InvalidCredentialsError extends BaseError {
  constructor() {
    super(
      'Credenciais inválidas. Verifique seu e-mail e senha.',
      'HttpStatus.UNAUTHORIZED',
      401,
    );
  }
}
