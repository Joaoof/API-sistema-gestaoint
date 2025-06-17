import { CreateGiftDto } from 'src/modules/gift/dtos/create-gift.dto';
import { Gift } from '../entities/gifts.entity';
import { GiftsRepository } from '../ports/gift.repository';

export class CreateGiftUseCase {
    constructor(private giftsRepository: GiftsRepository) { }

    async execute(input: CreateGiftDto): Promise<Gift> {        
        const gift = new Gift(
            input.name,
            input.description,
            input.imageUrl ?? '',
            input.price,
            new Date().toISOString(), // createdAt
            'available' // status
        );

        await this.giftsRepository.create(gift);
        return gift;
    }
}