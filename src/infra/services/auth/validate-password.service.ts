import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class ValidatePassword {
    constructor() { }

    async isValid(hashedPassword: string, password_hash: string): Promise<boolean> {
        return await argon2.verify(hashedPassword, password_hash);
    }
}