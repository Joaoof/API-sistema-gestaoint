import { registerEnumType } from '@nestjs/graphql';
import {
  AuditAction,
  CategoriaConstrucaoTipo,
  ObraStatus,
  StatusTransacao,
  TipoTransacao,
  VersaoOrcamentoStatus,
} from '@prisma/client';

registerEnumType(ObraStatus, { name: 'ObraStatus' });
registerEnumType(CategoriaConstrucaoTipo, { name: 'CategoriaConstrucaoTipo' });
registerEnumType(VersaoOrcamentoStatus, { name: 'VersaoOrcamentoStatus' });
registerEnumType(TipoTransacao, { name: 'TipoTransacao' });
registerEnumType(StatusTransacao, { name: 'StatusTransacao' });
registerEnumType(AuditAction, { name: 'AuditAction' });

export enum TipoData {
  COMPETENCIA = 'COMPETENCIA',
  REAL = 'REAL',
}
registerEnumType(TipoData, { name: 'TipoData' });
