import { Controller, Post, Body } from '@nestjs/common';
import { CreateGiftDto } from './dtos/create-gift.dto';
import { CreateGiftUseCase } from '@/core/use-cases/create-gift.use-case';

@Controller('gifts')
export class GiftController {
    constructor(private createGiftUseCase: CreateGiftUseCase) { }

    @Post()
    async create(@Body() dto: CreateGiftDto) {
        const gift = await this.createGiftUseCase.execute(dto);
        return gift;
    }
}