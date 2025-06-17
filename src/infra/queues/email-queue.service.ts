// src/services/email-queue.service.ts
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';

export class EmailQueueService {
    constructor(
        @InjectQueue('email') private emailQueue: Queue
    ) { }

    async addEmailJob(data: { to: string; subject: string; html: string }) {
        await this.emailQueue.add('send', data);
    }
}  