import { PrismaService } from 'prisma/prisma.service';
import { LoggerService } from '@nestjs/common';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

export abstract class PrismaBaseRepository<T> {
    protected constructor(
        protected readonly prisma: PrismaService,
        protected readonly logger: LoggerService,
        protected readonly modelName: string,
    ) { }

    async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
        try {
            return await this.prisma.$transaction(callback);
        } catch (error) {
            this.logger.error(`Transaction failed on ${this.modelName}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Database transaction failed: ${error.message}`);
        }
    }

    protected handleException(error: any, action: string): never {
        const errorMessage = `Failed to ${action} ${this.modelName}: ${error.message}`;
        this.logger.error(errorMessage, error.stack);

        if (error.code === 'P2002') {
            throw new BadRequestException(`Unique constraint violation on ${this.modelName}`);
        }

        throw new InternalServerErrorException(errorMessage);
    }
}