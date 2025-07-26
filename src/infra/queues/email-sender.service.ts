// src/services/email-sender.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailSenderService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com', // trocar pelo seu SMTP
            port: 587,                    // geralmente 587 ou 465 (SSL)
            secure: false,                // true se usar SSL (porta 465)
            auth: {
                user: 'joaodeus400@gmail.com',
                pass: 'yiux xvfw gscn fdwe',
            },
        });
    }

    async sendEmail(data: { to: string; subject: string; html: string }) {
        console.log('[EMAIL SENDER] Enviando e-mail:', data);
        await this.transporter.sendMail({
            from: '"Karine" <joaodeus400@gmail.com>',
            to: data.to,
            subject: data.subject,
            html: data.html,
        });
    }
}
