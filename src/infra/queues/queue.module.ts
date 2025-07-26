import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailQueueListener } from './email-queue.listener';
import { EmailQueueService } from './email-queue.service';
import { EmailProcessor } from './email.processor';
import { EmailSenderService } from './email-sender.service';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'email',
        }),
    ],
    providers: [EmailQueueListener, EmailQueueService, EmailProcessor, EmailSenderService],
    exports: [BullModule, EmailQueueService], // exporta para outros módulos poderem usar a fila
})
export class QueuesModule { }
