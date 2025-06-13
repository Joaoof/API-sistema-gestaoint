import { Gift } from "src/core/entities/gifts.entity";
import { CreateGiftDto } from "../dtos/create-gift.dto";

export class GiftMapper {
    static toEntity(dto: CreateGiftDto): Gift {
        return new Gift({
            ...dto,
            status: 'available',
            createdAt: new Date(),
        });
    }
}