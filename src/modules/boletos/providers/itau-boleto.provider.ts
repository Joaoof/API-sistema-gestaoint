import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  BoletoProvider,
  CancelBoletoInput,
  CancelBoletoOutput,
  RegisterBoletoInput,
  RegisterBoletoOutput,
} from './boleto-provider.interface';

/**
 * Placeholder do provider do Itaú.
 *
 * Para implementar de verdade:
 *  1) Habilitar a API "Cobrança v2" no portal de desenvolvedores Itaú
 *     (https://devportal.itau.com.br)
 *  2) Gerar certificado mTLS (.crt + .key) — autenticação requer
 *  3) Variáveis de ambiente:
 *       ITAU_CLIENT_ID, ITAU_CLIENT_SECRET
 *       ITAU_CERT_PATH, ITAU_KEY_PATH
 *       ITAU_AGENCIA, ITAU_CONTA (ou ler do Bank registrado)
 *       ITAU_ENV (sandbox | production)
 *  4) Fluxo:
 *       a) POST /oauth/token (client_credentials, mTLS) → access_token
 *       b) POST /cash_management/v2/boletos_pix → registra
 *       c) GET /cash_management/v2/boletos_pix/{nossoNumero} → consulta
 *       d) PATCH …/baixa → cancelamento
 *  5) Webhook de pagamento confirma o status PAID + cria CashMovement
 *     (alinhar URL com o painel do Itaú).
 *
 * Não implementado aqui — exige acesso ao ambiente do banco e contrato.
 * Por enquanto, joga 501 pra ficar explícito.
 */
@Injectable()
export class ItauBoletoProvider implements BoletoProvider {
  readonly name = 'ITAU';

  async register(_input: RegisterBoletoInput): Promise<RegisterBoletoOutput> {
    throw new NotImplementedException(
      'Provider ITAU ainda não implementado. Veja src/modules/boletos/providers/itau-boleto.provider.ts pra checklist.',
    );
  }

  async cancel(_input: CancelBoletoInput): Promise<CancelBoletoOutput> {
    throw new NotImplementedException('Cancelamento ITAU não implementado.');
  }
}
