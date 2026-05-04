import { Injectable } from '@nestjs/common';
import {
  InvoiceProvider,
  InvoiceProviderRegistry,
} from '../ports/invoice-provider.port';
import { StubInvoiceProvider } from './stub-invoice-provider.adapter';

@Injectable()
export class DefaultInvoiceProviderRegistry implements InvoiceProviderRegistry {
  private readonly providers = new Map<string, InvoiceProvider>();

  constructor(private readonly stub: StubInvoiceProvider) {
    this.providers.set(stub.name, stub);
  }

  register(provider: InvoiceProvider): void {
    this.providers.set(provider.name, provider);
  }

  resolve(name: string | null | undefined): InvoiceProvider | null {
    if (!name) {
      return this.stub;
    }
    return this.providers.get(name) ?? null;
  }

  list(): InvoiceProvider[] {
    return Array.from(this.providers.values());
  }
}
