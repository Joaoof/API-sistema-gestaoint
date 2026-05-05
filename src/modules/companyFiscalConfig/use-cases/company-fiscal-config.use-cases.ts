import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, CompanyFiscalConfig } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { CompanyFiscalConfigEntity } from '../entities/company-fiscal-config.entity';
import { UpsertCompanyFiscalConfigInput } from '../dto/upsert-company-fiscal-config.input';

function toEntity(raw: CompanyFiscalConfig): CompanyFiscalConfigEntity {
  return {
    id: raw.id,
    companyId: raw.companyId,
    ambiente: raw.ambiente,
    regimeTributario: raw.regimeTributario,
    cnpj: raw.cnpj,
    inscricaoEstadual: raw.inscricaoEstadual,
    inscricaoMunicipal: raw.inscricaoMunicipal,
    razaoSocial: raw.razaoSocial,
    nomeFantasia: raw.nomeFantasia,
    endereco: raw.endereco,
    numero: raw.numero,
    complemento: raw.complemento,
    bairro: raw.bairro,
    cidade: raw.cidade,
    codigoMunicipioIbge: raw.codigoMunicipioIbge,
    uf: raw.uf,
    cep: raw.cep,
    serieNfe: raw.serieNfe,
    proximoNumeroNfe: raw.proximoNumeroNfe,
    serieNfce: raw.serieNfce,
    proximoNumeroNfce: raw.proximoNumeroNfce,
    serieNfse: raw.serieNfse,
    proximoNumeroNfse: raw.proximoNumeroNfse,
    hasCertificado: Boolean(raw.certificadoB64),
    certificadoValidoAte: raw.certificadoValidoAte,
    cscIdNfce: raw.cscIdNfce,
    providerName: raw.providerName,
    hasProviderToken: Boolean(raw.providerApiToken),
    providerCnpjReference: raw.providerCnpjReference,
    ativo: raw.ativo,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function toAuditSnapshot(raw: CompanyFiscalConfig): Record<string, unknown> {
  // Avoid logging secrets (certificate base64, encrypted password, provider token, webhook secret).
  const {
    certificadoB64: _certificadoB64,
    certificadoSenhaCifrada: _certificadoSenhaCifrada,
    providerApiToken: _providerApiToken,
    providerWebhookSecret: _providerWebhookSecret,
    cscNfce: _cscNfce,
    ...safe
  } = raw;
  return {
    ...safe,
    hasCertificado: Boolean(_certificadoB64),
    hasProviderToken: Boolean(_providerApiToken),
  };
}

@Injectable()
export class CompanyFiscalConfigUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async get(companyId: string): Promise<CompanyFiscalConfigEntity | null> {
    const config = await this.prisma.companyFiscalConfig.findUnique({
      where: { companyId },
    });
    return config ? toEntity(config) : null;
  }

  async upsert(
    actor: AuditActor,
    companyId: string,
    input: UpsertCompanyFiscalConfigInput,
  ): Promise<CompanyFiscalConfigEntity> {
    const data = {
      ambiente: input.ambiente,
      regimeTributario: input.regimeTributario,
      cnpj: input.cnpj.replace(/\D/g, ''),
      inscricaoEstadual: input.inscricaoEstadual ?? null,
      inscricaoMunicipal: input.inscricaoMunicipal ?? null,
      razaoSocial: input.razaoSocial ?? null,
      nomeFantasia: input.nomeFantasia ?? null,
      endereco: input.endereco ?? null,
      numero: input.numero ?? null,
      complemento: input.complemento ?? null,
      bairro: input.bairro ?? null,
      cidade: input.cidade ?? null,
      codigoMunicipioIbge: input.codigoMunicipioIbge ?? null,
      uf: input.uf?.toUpperCase() ?? null,
      cep: input.cep ?? null,
      serieNfe: input.serieNfe,
      proximoNumeroNfe: input.proximoNumeroNfe,
      serieNfce: input.serieNfce,
      proximoNumeroNfce: input.proximoNumeroNfce,
      serieNfse: input.serieNfse,
      proximoNumeroNfse: input.proximoNumeroNfse,
      cscNfce: input.cscNfce ?? null,
      cscIdNfce: input.cscIdNfce ?? null,
      certificadoB64: input.certificadoB64 ?? null,
      certificadoSenhaCifrada: input.certificadoSenha ?? null,
      certificadoValidoAte: input.certificadoValidoAte ?? null,
      providerName: input.providerName ?? null,
      providerApiToken: input.providerApiToken ?? null,
      providerCnpjReference: input.providerCnpjReference ?? null,
      providerWebhookSecret: input.providerWebhookSecret ?? null,
      ativo: input.ativo,
    };

    const existing = await this.prisma.companyFiscalConfig.findUnique({
      where: { companyId },
    });

    const saved = await this.prisma.companyFiscalConfig.upsert({
      where: { companyId },
      create: { companyId, ...data },
      update: data,
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'CompanyFiscalConfig',
      entityId: saved.id,
      action: existing ? AuditAction.UPDATE : AuditAction.CREATE,
      before: existing ? toAuditSnapshot(existing) : undefined,
      after: toAuditSnapshot(saved),
    });

    return toEntity(saved);
  }

  async remove(actor: AuditActor, companyId: string): Promise<boolean> {
    const config = await this.prisma.companyFiscalConfig.findUnique({
      where: { companyId },
    });
    if (!config) {
      throw new NotFoundException('Configuração fiscal não encontrada.');
    }
    await this.prisma.companyFiscalConfig.delete({
      where: { companyId },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'CompanyFiscalConfig',
      entityId: config.id,
      action: AuditAction.DELETE,
      before: toAuditSnapshot(config),
    });

    return true;
  }
}
