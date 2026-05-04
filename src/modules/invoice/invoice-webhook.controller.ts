import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { InvoiceUseCases } from './use-cases/invoice.use-cases';

@Controller('webhooks/invoice')
export class InvoiceWebhookController {
  constructor(private readonly useCases: InvoiceUseCases) {}

  @Post(':provider')
  @HttpCode(200)
  async handle(
    @Param('provider') provider: string,
    @Body() body: unknown,
    @Headers('x-signature') signature?: string,
  ): Promise<{ ok: boolean; invoiceId?: string }> {
    return this.useCases.handleProviderWebhook(provider, body, signature ?? null);
  }
}
