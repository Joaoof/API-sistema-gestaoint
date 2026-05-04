import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { InvoiceResolver } from './invoice.resolver';
import { InvoiceWebhookController } from './invoice-webhook.controller';
import { InvoiceUseCases } from './use-cases/invoice.use-cases';
import { StubInvoiceProvider } from './adapters/stub-invoice-provider.adapter';
import { DefaultInvoiceProviderRegistry } from './adapters/invoice-provider.registry';

@Module({
  imports: [PrismaModule],
  controllers: [InvoiceWebhookController],
  providers: [
    InvoiceResolver,
    InvoiceUseCases,
    StubInvoiceProvider,
    DefaultInvoiceProviderRegistry,
  ],
  exports: [InvoiceUseCases, DefaultInvoiceProviderRegistry],
})
export class InvoiceModule {}
