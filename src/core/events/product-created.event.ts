// src/core/events/product-created.event.ts

export class ProductCreatedEvent {
    constructor(
        public readonly id: string,
        public readonly nameProduct: string,
    ) { }
}