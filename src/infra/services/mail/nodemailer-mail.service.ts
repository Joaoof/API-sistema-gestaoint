// src/infra/services/mail/nodemailer-mail.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailService } from 'src/core/ports/mail.service';

@Injectable()
export class NodemailerMailService implements MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMailProduct(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const message = {
      from: `"Seu Sistema" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(message);
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error.message);
      throw new Error(`Falha ao enviar e-mail para ${to}`);
    }
  }
}
