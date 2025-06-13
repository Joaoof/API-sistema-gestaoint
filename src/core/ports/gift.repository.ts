import { Gift } from "../entities/gifts.entity";

export interface GiftsRepository {
    create(gift: Gift): Promise<void>;
    findById(id: string): Promise<Gift | null>;
    findAll(): Promise<Gift[]>;
}