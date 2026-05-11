/**
 * Contrato comum a todos os provedores de boleto (banco/PSP).
 *
 * Implementações esperadas:
 *  - MockBoletoProvider   (dev/teste — gera dados falsos)
 *  - ItauBoletoProvider   (produção — placeholder; preencher com API real)
 *  - SicrediBoletoProvider, BradescoBoletoProvider, etc.
 *
 * Cada provider lê suas próprias credenciais do `.env` ou de um cadastro
 * por empresa (no futuro).
 */

export interface RegisterBoletoInput {
  amount: number;
  dueDate: Date;
  payerName: string;
  payerDocument: string;
  instructions?: string | null;
  externalRef?: string; // ex: id interno do Boleto
  /** Banco do GestãoInt (Bank.id) — usado pra resolver credencial. */
  bankRef?: { id: string; pixKey?: string | null; agencia?: string | null; conta?: string | null };
}

export interface RegisterBoletoOutput {
  providerBoletoId: string;
  nossoNumero: string;
  barcode: string;
  digitableLine: string;
  pdfUrl?: string | null;
  raw?: unknown;
}

export interface CancelBoletoInput {
  providerBoletoId: string;
}

export interface CancelBoletoOutput {
  ok: boolean;
  raw?: unknown;
}

export interface BoletoProvider {
  /** Identificador único do provider (deve bater com `Boleto.provider`). */
  readonly name: string;

  register(input: RegisterBoletoInput): Promise<RegisterBoletoOutput>;
  cancel(input: CancelBoletoInput): Promise<CancelBoletoOutput>;
}
