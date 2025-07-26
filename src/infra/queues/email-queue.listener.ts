import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { EmailQueueService } from './email-queue.service';
import { ProductCreatedEvent } from 'src/core/events/product-created.event';

@Injectable()
export class EmailQueueListener {
    constructor(private readonly emailQueue: EmailQueueService) { }

    @OnEvent('product.created')
    async handleProductCreatedEvent(event: ProductCreatedEvent) {
        console.log('[EVENT] Produto criado:', event); // 👈 Esse cara tem que aparecer no terminal

        await this.emailQueue.addEmailJob({
            to: 'joaodeus400@gmail.com',
            subject: 'Produto criado',
            html: `<p>O produto ${event.nameProduct} foi criado com ID: ${event.id}</p>`
        });
    }
}