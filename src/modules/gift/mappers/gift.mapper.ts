import { Gift } from "src/core/entities/gifts.entity";
import { CreateGiftDto } from "../dtos/create-gift.dto";

export class GiftMapper {
    static toEntity(dto: CreateGiftDto): Gift {
        return new Gift(
            dto.name,
            dto.description,
            dto.price.toString(),
            dto.imageUrl !== undefined ? Number(dto.imageUrl) : 0,
            new Date().toISOString(),
            'available'
        );
    }
}