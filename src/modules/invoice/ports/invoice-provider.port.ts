import { InvoiceStatus, InvoiceType, FiscalEnvironment, TaxRegime } from '@prisma/client';

export const INVOICE_PROVIDER_REGISTRY = Symbol('INVOICE_PROVIDER_REGISTRY');

export interface IssuerConfig {
  cnpj: string;
  inscricaoEstadual?: string | null;
  inscricaoMunicipal?: string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  regimeTributario: TaxRegime;
  ambiente: FiscalEnvironment;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  codigoMunicipioIbge?: string | null;
  uf?: string | null;
  cep?: string | null;
  cscNfce?: string | null;
  cscIdNfce?: string | null;
  certificadoB64?: string | null;
  certificadoSenha?: string | null;
  providerApiToken?: string | null;
  providerCnpjReference?: string | null;
}

export interface RecipientPayload {
  name: string;
  document?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  uf?: string | null;
  zip?: string | null;
}

export interface ProviderItemPayload {
  ordem: number;
  codigo: string;
  descricao: string;
  ncm?: string | null;
  cfop?: string | null;
  cest?: string | null;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorDesconto: number;
  valorTotal: number;
  origemMercadoria?: string | null;
  csosn?: string | null;
  cstIcms?: string | null;
  aliquotaIcms?: number | null;
}

export interface IssueInvoicePayload {
  type: InvoiceType;
  numero: number;
  serie: number;
  naturezaOperacao: string;
  paymentMethod?: string | null;
  observacoes?: string | null;
  valorProdutos: number;
  valorDesconto: number;
  valorFrete: number;
  valorTotal: number;
  issuer: IssuerConfig;
  recipient: RecipientPayload;
  items: ProviderItemPayload[];
}

export interface ProviderIssueResult {
  providerRef: string;
  status: InvoiceStatus;
  chaveAcesso?: string | null;
  protocoloAutorizacao?: string | null;
  dataAutorizacao?: Date | null;
  xmlUrl?: string | null;
  danfeUrl?: string | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  raw?: unknown;
}

export interface ProviderCancelResult {
  status: InvoiceStatus;
  protocoloCancelamento?: string | null;
  dataCancelamento?: Date | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  raw?: unknown;
}

export interface ProviderFetchResult {
  status: InvoiceStatus;
  chaveAcesso?: string | null;
  protocoloAutorizacao?: string | null;
  xmlUrl?: string | null;
  danfeUrl?: string | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  raw?: unknown;
}

export interface ProviderWebhookEvent {
  providerRef: string;
  status: InvoiceStatus;
  chaveAcesso?: string | null;
  protocoloAutorizacao?: string | null;
  protocoloCancelamento?: string | null;
  xmlUrl?: string | null;
  danfeUrl?: string | null;
  errorMessage?: string | null;
  errorCode?: string | null;
}

export interface InvoiceProvider {
  readonly name: string;
  issue(payload: IssueInvoicePayload): Promise<ProviderIssueResult>;
  cancel(providerRef: string, motivo: string, issuer: IssuerConfig): Promise<ProviderCancelResult>;
  fetch(providerRef: string, issuer: IssuerConfig): Promise<ProviderFetchResult>;
  parseWebhook(payload: unknown, signatureHeader?: string | null, secret?: string | null): ProviderWebhookEvent | null;
}

export interface InvoiceProviderRegistry {
  resolve(name: string | null | undefined): InvoiceProvider | null;
  list(): InvoiceProvider[];
}
