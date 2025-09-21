import * as argon2 from 'argon2';
import { Injectable } from "@nestjs/common";

@Injectable()
export class ValidatePassword {
    async isValid(hash: string, password: string): Promise<boolean> {
        try {
            return await argon2.verify(hash, password);
        } catch (error) {
            console.error('Erro ao validar senha', error);
            return false;
        }
    }
}
