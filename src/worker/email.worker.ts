// src/worker/email.worker.ts
import { Processor, Process } from '@nestjs/bull';
import * as nodemailer from 'nodemailer';

@Processor('email')
export class EmailWorker {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }

    @Process('send')
    async sendEmail(job) {
        const { data } = job;
        await this.transporter.sendMail({
            from: '"Sistema JC" <seu-email@gmail.com>',
            to: data.to,
            subject: data.subject,
            html: data.html,
        });
    }
}