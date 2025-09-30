/* eslint-disable no-unused-vars */

export interface MailService {
  sendMailProduct(to: string, subject: string, html: string): Promise<void>;
}
