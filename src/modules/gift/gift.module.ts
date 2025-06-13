import { Module } from '@nestjs/common';
import { GiftController } from './controllers/gift.controller';
import { CreateGiftUseCase } from '@/core/use-cases/gift/create-gift.use-case';
import { PrismaGiftsRepository } from '@/core/adapters/gift.prisma.repository';
import { Gift } from '@/core/entities/gift';

@Module({
    controllers: [GiftController],
    providers: [
        CreateGiftUseCase,
        {
            provide: 'GiftsRepository',
            useClass: PrismaGiftsRepository,
        },
        {
            provide: Gift,
            useValue: Gift,
        },
    ],
})
export class GiftModule { }