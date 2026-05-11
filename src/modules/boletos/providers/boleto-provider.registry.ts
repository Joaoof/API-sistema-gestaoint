import { BadRequestException, Injectable } from '@nestjs/common';
import { BoletoProvider } from './boleto-provider.interface';
import { ItauBoletoProvider } from './itau-boleto.provider';
import { MockBoletoProvider } from './mock-boleto.provider';

/**
 * Resolução do provider pelo nome (vem do .env BOLETO_PROVIDER ou do
 * cadastro do Banco). Centraliza pra que adicionar provider novo seja
 * uma linha aqui + nova classe que implementa BoletoProvider.
 */
@Injectable()
export class BoletoProviderRegistry {
  private readonly providers: Map<string, BoletoProvider>;

  constructor(
    private readonly mock: MockBoletoProvider,
    private readonly itau: ItauBoletoProvider,
  ) {
    this.providers = new Map<string, BoletoProvider>([
      [this.mock.name, this.mock],
      [this.itau.name, this.itau],
    ]);
  }

  get(name: string): BoletoProvider {
    const p = this.providers.get(name.toUpperCase());
    if (!p) {
      throw new BadRequestException(
        `Provider de boleto "${name}" não cadastrado. Disponíveis: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }
    return p;
  }

  defaultProviderName(): string {
    return process.env.BOLETO_PROVIDER ?? 'MOCK';
  }
}
