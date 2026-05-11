import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BoletoProvider,
  CancelBoletoInput,
  CancelBoletoOutput,
  RegisterBoletoInput,
  RegisterBoletoOutput,
} from './boleto-provider.interface';

/**
 * Provider de mock — gera dados sintéticos plausíveis sem chamar banco real.
 * Use em dev/staging. Em produção, troque pelo provider do banco contratado.
 */
@Injectable()
export class MockBoletoProvider implements BoletoProvider {
  readonly name = 'MOCK';

  async register(input: RegisterBoletoInput): Promise<RegisterBoletoOutput> {
    const id = randomUUID().replace(/-/g, '').slice(0, 20);
    const nossoNumero = `MOCK${id.slice(0, 10).toUpperCase()}`;
    // Linha digitável fictícia — formato 47 dígitos como banco
    const digitable = this.fakeDigitableLine(input.amount, input.dueDate);
    const barcode = digitable.replace(/\D/g, '').slice(0, 44).padStart(44, '0');
    return {
      providerBoletoId: id,
      nossoNumero,
      barcode,
      digitableLine: digitable,
      pdfUrl: `/api/boletos/mock/${id}.pdf`,
      raw: { mock: true, generatedAt: new Date().toISOString() },
    };
  }

  async cancel(_input: CancelBoletoInput): Promise<CancelBoletoOutput> {
    return { ok: true, raw: { mock: true, canceledAt: new Date().toISOString() } };
  }

  private fakeDigitableLine(amount: number, dueDate: Date): string {
    const value = String(Math.round(amount * 100)).padStart(10, '0');
    const days = Math.floor((dueDate.getTime() - new Date('1997-10-07').getTime()) / 86400000);
    const fator = String(days).padStart(4, '0');
    // 47 dígitos com pontuação padrão de boleto bancário
    const part1 = `00190.50009`;
    const part2 = `40444.${value.slice(0, 6)}1`;
    const part3 = `06275.${value.slice(0, 6)}2`;
    return `${part1} ${part2} ${part3} 9 ${fator}${value}`;
  }
}
