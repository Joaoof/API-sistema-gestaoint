// src/core/ports/mail.service.ts
export interface MailService {
  sendMailProduct(to: string, subject: string, html: string): Promise<void>;
}
