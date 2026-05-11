import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as https from 'https';
import {
  BoletoProvider,
  CancelBoletoInput,
  CancelBoletoOutput,
  RegisterBoletoInput,
  RegisterBoletoOutput,
} from './boleto-provider.interface';

/**
 * Implementação real do Itaú — API "Cobrança v2 (Boleto + PIX)".
 *
 * 🔧 Setup necessário no .env:
 *   ITAU_CLIENT_ID
 *   ITAU_CLIENT_SECRET
 *   ITAU_CERT_PATH=/secrets/itau.crt    (certificado A1 — assinatura)
 *   ITAU_KEY_PATH=/secrets/itau.key     (chave privada do A1)
 *   ITAU_AGENCIA=XXXX                    (4 dígitos)
 *   ITAU_CONTA=XXXXXX                    (sem dígito)
 *   ITAU_CONTA_DV=X                      (1 dígito verificador)
 *   ITAU_CARTEIRA=109                    (default 109 PJ)
 *   ITAU_ENV=sandbox|production          (default sandbox)
 *   ITAU_WEBHOOK_SECRET=...              (opcional, valida HMAC do webhook)
 *
 * 🌐 Hosts:
 *   sandbox:    https://sandbox.devportal.itau.com.br
 *   production: https://secure.api.itau  (mTLS obrigatório)
 *
 * 📋 Checklist de habilitação:
 *   1. Conta empresarial Itaú PJ + iToken Pro/Bankline
 *   2. Pedir ao gerente PJ habilitação da API Cobrança v2 (formulário)
 *   3. Acessar devportal.itau.com.br → criar Aplicação → gerar credenciais
 *   4. Solicitar certificado digital A1 ICP-Brasil (vinculado ao CNPJ)
 *   5. Cadastrar URL de webhook (https://SEU_HOST/api/webhooks/boleto/itau)
 *   6. Testar em sandbox antes de ativar produção
 */
@Injectable()
export class ItauBoletoProvider implements BoletoProvider {
  readonly name = 'ITAU';
  private readonly logger = new Logger(ItauBoletoProvider.name);
  private accessToken: { value: string; expiresAt: number } | null = null;

  private get host(): string {
    return process.env.ITAU_ENV === 'production'
      ? 'https://secure.api.itau'
      : 'https://sandbox.devportal.itau.com.br';
  }

  private get isConfigured(): boolean {
    return !!(
      process.env.ITAU_CLIENT_ID &&
      process.env.ITAU_CLIENT_SECRET &&
      process.env.ITAU_AGENCIA &&
      process.env.ITAU_CONTA
    );
  }

  private buildAgent(): https.Agent | undefined {
    const certPath = process.env.ITAU_CERT_PATH;
    const keyPath = process.env.ITAU_KEY_PATH;
    if (!certPath || !keyPath) return undefined;
    try {
      return new https.Agent({
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      });
    } catch (err) {
      this.logger.error(
        `Falha ao ler certificado Itaú: ${err instanceof Error ? err.message : err}`,
      );
      return undefined;
    }
  }

  /** OAuth client_credentials com mTLS. Token cacheado em memória. */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 30_000) {
      return this.accessToken.value;
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.ITAU_CLIENT_ID!,
      client_secret: process.env.ITAU_CLIENT_SECRET!,
    });
    const res = await fetch(`${this.host}/api/oauth/jwt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      // @ts-expect-error — agent não está nos types do fetch nativo do Node
      agent: this.buildAgent(),
    } as any);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new InternalServerErrorException(`Itaú OAuth ${res.status}: ${errBody}`);
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  }

  async register(input: RegisterBoletoInput): Promise<RegisterBoletoOutput> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException(
        'Credenciais Itaú não configuradas. Defina ITAU_CLIENT_ID, ITAU_CLIENT_SECRET, ITAU_AGENCIA, ITAU_CONTA, ITAU_CERT_PATH, ITAU_KEY_PATH no .env. Veja src/modules/boletos/providers/itau-boleto.provider.ts',
      );
    }

    const token = await this.getAccessToken();

    /**
     * Payload Itaú Cobrança v2 — mínimo viável.
     * O contrato real tem ~60 campos opcionais; aqui só o essencial.
     */
    const isCnpj = input.payerDocument.length > 11;
    const body = {
      etapa_processo_boleto: 'efetivacao',
      beneficiario: {
        id_beneficiario: process.env.ITAU_AGENCIA! + process.env.ITAU_CONTA!,
        agencia: process.env.ITAU_AGENCIA,
        conta: process.env.ITAU_CONTA,
        digito_conta: process.env.ITAU_CONTA_DV ?? '0',
      },
      dado_boleto: {
        tipo_boleto: 'a vista',
        codigo_carteira: process.env.ITAU_CARTEIRA ?? '109',
        descricao_instrumento_cobranca: input.instructions ?? 'Cobrança',
        valor_total_titulo: input.amount.toFixed(2),
        data_vencimento: input.dueDate.toISOString().slice(0, 10),
        pagador: {
          pessoa: {
            nome_pessoa: input.payerName,
            tipo_pessoa: {
              codigo_tipo_pessoa: isCnpj ? 'J' : 'F',
              numero_cadastro_pessoa_fisica: isCnpj ? undefined : input.payerDocument,
              numero_cadastro_nacional_pessoa_juridica: isCnpj ? input.payerDocument : undefined,
            },
          },
        },
      },
    };

    const res = await fetch(`${this.host}/cash_management/v2/boletos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-itau-correlationID': input.externalRef ?? '',
      },
      body: JSON.stringify(body),
      // @ts-expect-error
      agent: this.buildAgent(),
    } as any);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.logger.error(`Itaú boleto ${res.status}: ${errBody}`);
      throw new InternalServerErrorException(`Itaú rejeitou: ${errBody}`);
    }

    const data = (await res.json()) as any;
    const dado = data.data?.dado_boleto ?? {};
    return {
      providerBoletoId: data.data?.id_boleto_individual ?? data.data?.numero_titulo ?? '',
      nossoNumero: dado.identificacao_boleto_empresa ?? dado.nosso_numero ?? '',
      barcode: dado.codigo_barras ?? '',
      digitableLine: dado.numero_linha_digitavel ?? '',
      pdfUrl: dado.url_arquivo ?? null,
      raw: data,
    };
  }

  async cancel(input: CancelBoletoInput): Promise<CancelBoletoOutput> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException('Credenciais Itaú não configuradas.');
    }
    const token = await this.getAccessToken();
    const res = await fetch(
      `${this.host}/cash_management/v2/boletos/${input.providerBoletoId}/baixa`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        // @ts-expect-error
        agent: this.buildAgent(),
      } as any,
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return { ok: false, raw: { error: errBody } };
    }
    return { ok: true, raw: await res.json().catch(() => ({})) };
  }
}
