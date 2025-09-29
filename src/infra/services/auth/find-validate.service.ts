import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ValidatePassword } from './validate-password.service';
import { InvalidCredentialsError } from 'src/core/exceptions/invalid-credentials.exception';

@Injectable()
export class FindValidateUser {
  private readonly prisma: PrismaService;
  private readonly validatePassword: ValidatePassword;
  constructor(prisma: PrismaService, validatePassword: ValidatePassword) {
    this.prisma = prisma;
    this.validatePassword = validatePassword;
  }

  async isValid(email: string, passwordInput: string) {
    const record = await this.prisma.users.findUnique({
      where: { email },
      select: { id: true, email: true, password_hash: true },
    });
    if (!record) throw new InvalidCredentialsError();

    const valid = await this.validatePassword.isValid(
      record.password_hash,
      passwordInput,
    );
    if (!valid) throw new InvalidCredentialsError();

    return record;
  }
}
