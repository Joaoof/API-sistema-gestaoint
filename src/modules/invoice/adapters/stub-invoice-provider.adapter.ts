import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  InvoiceProvider,
  IssueInvoicePayload,
  IssuerConfig,
  ProviderCancelResult,
  ProviderFetchResult,
  ProviderIssueResult,
  ProviderWebhookEvent,
} from '../ports/invoice-provider.port';

const NOT_CONFIGURED_MESSAGE =
  'Nenhum provedor de NFe configurado. Defina CompanyFiscalConfig.providerName e implemente o adapter correspondente em src/modules/invoice/adapters.';

function notConfigured(): never {
  throw new NotImplementedException(NOT_CONFIGURED_MESSAGE);
}

@Injectable()
export class StubInvoiceProvider implements InvoiceProvider {
  readonly name = 'stub';

  async issue(payload: IssueInvoicePayload): Promise<ProviderIssueResult> {
    void payload;
    return notConfigured();
  }

  async cancel(
    providerRef: string,
    motivo: string,
    issuer: IssuerConfig,
  ): Promise<ProviderCancelResult> {
    void providerRef;
    void motivo;
    void issuer;
    return notConfigured();
  }

  async fetch(
    providerRef: string,
    issuer: IssuerConfig,
  ): Promise<ProviderFetchResult> {
    void providerRef;
    void issuer;
    return notConfigured();
  }

  parseWebhook(
    payload: unknown,
    signatureHeader?: string | null,
    secret?: string | null,
  ): ProviderWebhookEvent | null {
    void payload;
    void signatureHeader;
    void secret;
    return null;
  }
}
