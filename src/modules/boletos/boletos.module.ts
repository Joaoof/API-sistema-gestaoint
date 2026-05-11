import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BoletosResolver } from './boletos.resolver';
import { BancoBrasilBoletoProvider } from './providers/bb-boleto.provider';
import { BoletoProviderRegistry } from './providers/boleto-provider.registry';
import { ItauBoletoProvider } from './providers/itau-boleto.provider';
import { MockBoletoProvider } from './providers/mock-boleto.provider';
import { BoletosService } from './use-cases/boletos.service';

@Module({
  imports: [PrismaModule],
  providers: [
    BoletosService,
    BoletosResolver,
    BoletoProviderRegistry,
    MockBoletoProvider,
    ItauBoletoProvider,
    BancoBrasilBoletoProvider,
  ],
  exports: [BoletosService],
})
export class BoletosModule {}
