import { Module } from '@nestjs/common';
import { GiftController } from './controllers/gift.controller';
import { CreateGiftUseCase } from 'src/core/use-cases/create-gift.use-case';
import { Gift } from 'src/core/entities/gifts.entity';
import { PrismaGiftsRepository } from 'src/infra/database/implementations/gift.prisma.repository';

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