import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import {
  BoletoProvider,
  CancelBoletoInput,
  CancelBoletoOutput,
  RegisterBoletoInput,
  RegisterBoletoOutput,
} from './boleto-provider.interface';

/**
 * Implementação real do Banco do Brasil — API "Cobrança v2".
 *
 * BB é MAIS SIMPLES que Itaú: OAuth client_credentials sem mTLS,
 * apenas client_id + client_secret + developer_key (gw-app-key).
 *
 * 🔧 Setup necessário no .env:
 *   BB_CLIENT_ID
 *   BB_CLIENT_SECRET
 *   BB_DEV_APP_KEY                       (gw-app-key — emitida no developers.bb)
 *   BB_AGENCIA=XXXX                       (sem dígito)
 *   BB_CONTA=XXXXXXX                      (sem dígito)
 *   BB_CONVENIO=XXXXXXX                   (número de convênio cobrança)
 *   BB_CARTEIRA=17
 *   BB_VARIACAO_CARTEIRA=019
 *   BB_ENV=sandbox|production             (default sandbox)
 *   BB_WEBHOOK_SECRET=...                 (opcional, valida HMAC)
 *
 * 🌐 Hosts:
 *   sandbox:    https://api.sandbox.bb.com.br
 *   production: https://api.bb.com.br
 *
 *   OAuth:
 *   sandbox:    https://oauth.sandbox.bb.com.br
 *   production: https://oauth.bb.com.br
 *
 * 📋 Checklist:
 *   1. Conta empresarial BB + Convênio de Cobrança (peça ao gerente PJ)
 *   2. Acessar developers.bb.com.br → criar Aplicação → APIs Cobrança v2
 *   3. Anotar developer_application_key (X-Application-Key)
 *   4. Cadastrar URL webhook no painel da app:
 *      https://SEU_HOST/api/webhooks/boleto/bb
 *   5. Testar sandbox antes
 */
@Injectable()
export class BancoBrasilBoletoProvider implements BoletoProvider {
  readonly name = 'BB';
  private readonly logger = new Logger(BancoBrasilBoletoProvider.name);
  private accessToken: { value: string; expiresAt: number } | null = null;

  private get host(): string {
    return process.env.BB_ENV === 'production'
      ? 'https://api.bb.com.br'
      : 'https://api.sandbox.bb.com.br';
  }
  private get oauthHost(): string {
    return process.env.BB_ENV === 'production'
      ? 'https://oauth.bb.com.br'
      : 'https://oauth.sandbox.bb.com.br';
  }

  private get isConfigured(): boolean {
    return !!(
      process.env.BB_CLIENT_ID &&
      process.env.BB_CLIENT_SECRET &&
      process.env.BB_DEV_APP_KEY &&
      process.env.BB_AGENCIA &&
      process.env.BB_CONTA &&
      process.env.BB_CONVENIO
    );
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 30_000) {
      return this.accessToken.value;
    }
    const basic = Buffer.from(
      `${process.env.BB_CLIENT_ID}:${process.env.BB_CLIENT_SECRET}`,
    ).toString('base64');

    const res = await fetch(`${this.oauthHost}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=cobrancas.boletos-info cobrancas.boletos-requisicao',
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new InternalServerErrorException(`BB OAuth ${res.status}: ${errBody}`);
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
        'Credenciais BB não configuradas. Defina BB_CLIENT_ID, BB_CLIENT_SECRET, BB_DEV_APP_KEY, BB_AGENCIA, BB_CONTA, BB_CONVENIO no .env. Veja src/modules/boletos/providers/bb-boleto.provider.ts',
      );
    }

    const token = await this.getAccessToken();
    // Nosso número BB: convênio (7 dígitos) + sequencial até 17 dígitos total.
    // Aqui geramos um sequencial a partir do timestamp pra ficar único.
    const seq = String(Date.now()).slice(-10);
    const nossoNumero = `${process.env.BB_CONVENIO}${seq}`;
    const isCnpj = input.payerDocument.length > 11;

    const body = {
      numeroConvenio: parseInt(process.env.BB_CONVENIO!, 10),
      numeroCarteira: parseInt(process.env.BB_CARTEIRA ?? '17', 10),
      numeroVariacaoCarteira: parseInt(process.env.BB_VARIACAO_CARTEIRA ?? '19', 10),
      codigoModalidade: 1,
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
      dataVencimento: input.dueDate.toLocaleDateString('pt-BR'),
      valorOriginal: input.amount,
      pagador: {
        tipoInscricao: isCnpj ? 2 : 1,
        numeroInscricao: input.payerDocument,
        nome: input.payerName,
      },
      beneficiarioFinal: undefined,
      indicadorAceiteTituloVencido: 'N',
      numeroDiasLimiteRecebimento: 5,
      codigoAceite: 'A',
      codigoTipoTitulo: 2,
      descricaoTipoTitulo: 'DM',
      indicadorPermissaoRecebimentoParcial: 'N',
      numeroTituloBeneficiario: input.externalRef ?? nossoNumero,
      campoUtilizacaoBeneficiario: input.instructions ?? 'Cobranca',
      numeroTituloCliente: nossoNumero,
    };

    const url = `${this.host}/cobrancas/v2/boletos?gw-dev-app-key=${process.env.BB_DEV_APP_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.logger.error(`BB boleto ${res.status}: ${errBody}`);
      throw new InternalServerErrorException(`BB rejeitou: ${errBody}`);
    }

    const data = (await res.json()) as any;
    return {
      providerBoletoId: data.numero ?? nossoNumero,
      nossoNumero: data.numero ?? nossoNumero,
      barcode: data.codigoBarraNumerico ?? '',
      digitableLine: data.linhaDigitavel ?? '',
      pdfUrl: null, // BB não retorna PDF — gerar localmente ou consultar /boletos/{id}/imagem
      raw: data,
    };
  }

  async cancel(input: CancelBoletoInput): Promise<CancelBoletoOutput> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException('Credenciais BB não configuradas.');
    }
    const token = await this.getAccessToken();
    const url = `${this.host}/cobrancas/v2/boletos/${input.providerBoletoId}/baixar?gw-dev-app-key=${process.env.BB_DEV_APP_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        numeroConvenio: parseInt(process.env.BB_CONVENIO!, 10),
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return { ok: false, raw: { error: errBody } };
    }
    return { ok: true, raw: await res.json().catch(() => ({})) };
  }
}
