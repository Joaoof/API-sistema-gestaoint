import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'email',
        }),
    ],
    exports: [BullModule], // exporta para outros módulos poderem usar a fila
})
export class QueuesModule { }
