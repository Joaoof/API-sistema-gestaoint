import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { EmailQueueService } from './email-queue.service';
import { EmailSenderService } from './email-sender.service';

@Processor('email')
export class EmailProcessor {
    constructor(private readonly emailSenderService: EmailSenderService) { }

    @Process('send')
    async handleSendEmail(job: Job) {
        console.log('[EMAIL PROCESSOR] Recebido job:', job.data);
        await this.emailSenderService.sendEmail(job.data);
    }
}
