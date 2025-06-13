import { PipeTransform, BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform {
    constructor(private schema: z.Schema<T>) { }

    transform(value: T) {
        try {
            return this.schema.parse(value);
        } catch (error) {
            throw new BadRequestException('Erro de validação');
        }
    }
}