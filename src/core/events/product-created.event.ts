// src/core/events/product-created.event.ts

export class ProductCreatedEvent {
    constructor(
        public readonly productId: string,
        public readonly name: string,
        public readonly price: number,
        public readonly createdAt: Date,
    ) {}
}