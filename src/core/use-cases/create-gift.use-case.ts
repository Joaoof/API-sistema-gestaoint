import { Gift } from '../entities/gifts.entity';
import { GiftsRepository } from '../ports/gift.repository';

export class CreateGiftUseCase {
    constructor(private giftsRepository: GiftsRepository) { }

    async execute(input: Gift): Promise<Gift> {
        const gift = new Gift({
            ...input,
            status: 'available',
        });

        await this.giftsRepository.create(gift);
        return gift;
    }
}