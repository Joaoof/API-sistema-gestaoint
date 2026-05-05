import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  CompanyFiscalConfig,
  InvoiceStatus,
  InvoiceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import {
  IssueInvoiceInput,
  IssueInvoiceItemInput,
  ListInvoicesInput,
} from '../dto/issue-invoice.input';
import { InvoiceEntity, InvoiceItemEntity } from '../entities/invoice.entity';
import { DefaultInvoiceProviderRegistry } from '../adapters/invoice-provider.registry';
import {
  InvoiceProvider,
  IssuerConfig,
  ProviderItemPayload,
} from '../ports/invoice-provider.port';

type RawInvoice = Prisma.InvoiceGetPayload<{ include: { items: true } }>;

function toItemEntity(
  raw: Prisma.InvoiceItemGetPayload<object>,
): InvoiceItemEntity {
  return {
    id: raw.id,
    ordem: raw.ordem,
    codigo: raw.codigo,
    descricao: raw.descricao,
    ncm: raw.ncm,
    cfop: raw.cfop,
    cest: raw.cest,
    unidade: raw.unidade,
    quantidade: Number(raw.quantidade),
    valorUnitario: Number(raw.valorUnitario),
    valorDesconto: Number(raw.valorDesconto),
    valorTotal: Number(raw.valorTotal),
    origemMercadoria: raw.origemMercadoria,
    csosn: raw.csosn,
    cstIcms: raw.cstIcms,
    aliquotaIcms: raw.aliquotaIcms ? Number(raw.aliquotaIcms) : null,
    productId: raw.productId,
  };
}

function toEntity(raw: RawInvoice): InvoiceEntity {
  return {
    id: raw.id,
    companyId: raw.companyId,
    userId: raw.userId,
    orderId: raw.orderId,
    type: raw.type,
    status: raw.status,
    ambiente: raw.ambiente,
    numero: raw.numero,
    serie: raw.serie,
    chaveAcesso: raw.chaveAcesso,
    protocoloAutorizacao: raw.protocoloAutorizacao,
    protocoloCancelamento: raw.protocoloCancelamento,
    motivoCancelamento: raw.motivoCancelamento,
    dataEmissao: raw.dataEmissao,
    dataAutorizacao: raw.dataAutorizacao,
    dataCancelamento: raw.dataCancelamento,
    recipientName: raw.recipientName,
    recipientDocument: raw.recipientDocument,
    recipientEmail: raw.recipientEmail,
    recipientAddress: raw.recipientAddress,
    recipientCity: raw.recipientCity,
    recipientUf: raw.recipientUf,
    recipientZip: raw.recipientZip,
    naturezaOperacao: raw.naturezaOperacao,
    paymentMethod: raw.paymentMethod,
    valorProdutos: Number(raw.valorProdutos),
    valorDesconto: Number(raw.valorDesconto),
    valorFrete: Number(raw.valorFrete),
    valorTotal: Number(raw.valorTotal),
    observacoes: raw.observacoes,
    providerName: raw.providerName,
    providerRef: raw.providerRef,
    xmlUrl: raw.xmlUrl,
    danfeUrl: raw.danfeUrl,
    errorMessage: raw.errorMessage,
    errorCode: raw.errorCode,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    items: (raw.items ?? []).map(toItemEntity),
  };
}

function toAuditSnapshot(raw: RawInvoice): Record<string, unknown> {
  return {
    ...raw,
    valorProdutos: Number(raw.valorProdutos),
    valorDesconto: Number(raw.valorDesconto),
    valorFrete: Number(raw.valorFrete),
    valorTotal: Number(raw.valorTotal),
    items: (raw.items ?? []).map((i) => ({
      ...i,
      quantidade: Number(i.quantidade),
      valorUnitario: Number(i.valorUnitario),
      valorDesconto: Number(i.valorDesconto),
      valorTotal: Number(i.valorTotal),
      aliquotaIcms: i.aliquotaIcms ? Number(i.aliquotaIcms) : null,
    })),
  };
}

function buildIssuerConfig(config: CompanyFiscalConfig): IssuerConfig {
  return {
    cnpj: config.cnpj,
    inscricaoEstadual: config.inscricaoEstadual,
    inscricaoMunicipal: config.inscricaoMunicipal,
    razaoSocial: config.razaoSocial,
    nomeFantasia: config.nomeFantasia,
    regimeTributario: config.regimeTributario,
    ambiente: config.ambiente,
    endereco: config.endereco,
    numero: config.numero,
    complemento: config.complemento,
    bairro: config.bairro,
    cidade: config.cidade,
    codigoMunicipioIbge: config.codigoMunicipioIbge,
    uf: config.uf,
    cep: config.cep,
    cscNfce: config.cscNfce,
    cscIdNfce: config.cscIdNfce,
    certificadoB64: config.certificadoB64,
    certificadoSenha: config.certificadoSenhaCifrada,
    providerApiToken: config.providerApiToken,
    providerCnpjReference: config.providerCnpjReference,
  };
}

function toProviderItem(item: IssueInvoiceItemInput): ProviderItemPayload {
  return {
    ordem: item.ordem,
    codigo: item.codigo,
    descricao: item.descricao,
    ncm: item.ncm ?? null,
    cfop: item.cfop ?? null,
    cest: item.cest ?? null,
    unidade: item.unidade,
    quantidade: item.quantidade,
    valorUnitario: item.valorUnitario,
    valorDesconto: item.valorDesconto,
    valorTotal: item.valorTotal,
    origemMercadoria: item.origemMercadoria ?? null,
    csosn: item.csosn ?? null,
    cstIcms: item.cstIcms ?? null,
    aliquotaIcms: item.aliquotaIcms ?? null,
  };
}

function pickSerieAndNumeroFields(type: InvoiceType): {
  serieField:
    | 'serieNfe'
    | 'serieNfce'
    | 'serieNfse';
  numeroField:
    | 'proximoNumeroNfe'
    | 'proximoNumeroNfce'
    | 'proximoNumeroNfse';
} {
  switch (type) {
    case InvoiceType.NFE:
      return { serieField: 'serieNfe', numeroField: 'proximoNumeroNfe' };
    case InvoiceType.NFCE:
      return { serieField: 'serieNfce', numeroField: 'proximoNumeroNfce' };
    case InvoiceType.NFSE:
      return { serieField: 'serieNfse', numeroField: 'proximoNumeroNfse' };
  }
}

@Injectable()
export class InvoiceUseCases {
  private readonly logger = new Logger(InvoiceUseCases.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    @Inject(DefaultInvoiceProviderRegistry)
    private readonly providers: DefaultInvoiceProviderRegistry,
  ) {}

  async list(
    companyId: string,
    args: ListInvoicesInput,
  ): Promise<InvoiceEntity[]> {
    const where: Prisma.InvoiceWhereInput = { companyId };
    if (args.type) where.type = args.type;
    if (args.status) where.status = args.status as InvoiceStatus;
    if (args.orderId) where.orderId = args.orderId;
    if (args.search) {
      where.OR = [
        { recipientName: { contains: args.search, mode: 'insensitive' } },
        { recipientDocument: { contains: args.search, mode: 'insensitive' } },
        { chaveAcesso: { contains: args.search } },
        { providerRef: { contains: args.search } },
      ];
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { items: { orderBy: { ordem: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(args.take ?? 50, 200),
      skip: args.skip ?? 0,
    });
    return invoices.map(toEntity);
  }

  async findById(companyId: string, id: string): Promise<InvoiceEntity> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { ordem: 'asc' } } },
    });
    if (!invoice || invoice.companyId !== companyId) {
      throw new NotFoundException('Nota fiscal não encontrada.');
    }
    return toEntity(invoice);
  }

  async issue(
    actor: AuditActor,
    input: IssueInvoiceInput,
  ): Promise<InvoiceEntity> {
    const companyId = actor.companyId;
    const userId = actor.userId;

    const config = await this.prisma.companyFiscalConfig.findUnique({
      where: { companyId },
    });
    if (!config) {
      throw new BadRequestException(
        'Empresa sem configuração fiscal. Cadastre os dados em Configurações > Fiscal antes de emitir.',
      );
    }
    if (!config.ativo) {
      throw new ForbiddenException('Emissão fiscal desativada para esta empresa.');
    }

    const provider = this.providers.resolve(config.providerName);
    if (!provider) {
      throw new BadRequestException(
        `Provedor "${config.providerName}" não está registrado. Implemente o adapter ou ajuste a configuração.`,
      );
    }

    const valorProdutos = input.items.reduce(
      (acc, item) => acc + Number(item.valorTotal),
      0,
    );
    const valorTotal =
      valorProdutos - Number(input.valorDesconto) + Number(input.valorFrete);

    const { numero, serie } = await this.reserveNextNumero(config.id, input.type);

    const draft = await this.prisma.invoice.create({
      data: {
        companyId,
        userId,
        orderId: input.orderId ?? null,
        type: input.type,
        status: InvoiceStatus.PROCESSING,
        ambiente: config.ambiente,
        numero,
        serie,
        recipientName: input.recipientName,
        recipientDocument: input.recipientDocument ?? null,
        recipientEmail: input.recipientEmail ?? null,
        recipientAddress: input.recipientAddress ?? null,
        recipientCity: input.recipientCity ?? null,
        recipientUf: input.recipientUf ?? null,
        recipientZip: input.recipientZip ?? null,
        naturezaOperacao: input.naturezaOperacao,
        paymentMethod: input.paymentMethod ?? null,
        valorProdutos,
        valorDesconto: input.valorDesconto,
        valorFrete: input.valorFrete,
        valorTotal,
        observacoes: input.observacoes ?? null,
        providerName: provider.name,
        dataEmissao: new Date(),
        items: {
          create: input.items.map((item) => ({
            ordem: item.ordem,
            codigo: item.codigo,
            descricao: item.descricao,
            ncm: item.ncm ?? null,
            cfop: item.cfop ?? null,
            cest: item.cest ?? null,
            unidade: item.unidade,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
            valorDesconto: item.valorDesconto,
            valorTotal: item.valorTotal,
            origemMercadoria: item.origemMercadoria ?? null,
            csosn: item.csosn ?? null,
            cstIcms: item.cstIcms ?? null,
            aliquotaIcms: item.aliquotaIcms ?? null,
            productId: item.productId ?? null,
          })),
        },
      },
      include: { items: { orderBy: { ordem: 'asc' } } },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Invoice',
      entityId: draft.id,
      action: AuditAction.CREATE,
      after: toAuditSnapshot(draft),
      reason: `Emissão de nota ${input.type} iniciada.`,
    });

    try {
      const result = await provider.issue({
        type: input.type,
        numero,
        serie,
        naturezaOperacao: input.naturezaOperacao,
        paymentMethod: input.paymentMethod ?? null,
        observacoes: input.observacoes ?? null,
        valorProdutos,
        valorDesconto: input.valorDesconto,
        valorFrete: input.valorFrete,
        valorTotal,
        issuer: buildIssuerConfig(config),
        recipient: {
          name: input.recipientName,
          document: input.recipientDocument ?? null,
          email: input.recipientEmail ?? null,
          address: input.recipientAddress ?? null,
          city: input.recipientCity ?? null,
          uf: input.recipientUf ?? null,
          zip: input.recipientZip ?? null,
        },
        items: input.items.map(toProviderItem),
      });

      const updated = await this.prisma.invoice.update({
        where: { id: draft.id },
        data: {
          status: result.status,
          providerRef: result.providerRef,
          chaveAcesso: result.chaveAcesso ?? null,
          protocoloAutorizacao: result.protocoloAutorizacao ?? null,
          dataAutorizacao: result.dataAutorizacao ?? null,
          xmlUrl: result.xmlUrl ?? null,
          danfeUrl: result.danfeUrl ?? null,
          errorMessage: result.errorMessage ?? null,
          errorCode: result.errorCode ?? null,
          providerRawJson:
            (result.raw as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        },
        include: { items: { orderBy: { ordem: 'asc' } } },
      });

      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'Invoice',
        entityId: updated.id,
        action:
          result.status === InvoiceStatus.AUTHORIZED
            ? AuditAction.CONFIRM
            : AuditAction.UPDATE,
        before: toAuditSnapshot(draft),
        after: toAuditSnapshot(updated),
        reason: `Resposta do provedor: ${result.status}.`,
      });

      return toEntity(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      this.logger.error(
        `Falha ao emitir invoice ${draft.id}: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      const updated = await this.prisma.invoice.update({
        where: { id: draft.id },
        data: {
          status: InvoiceStatus.ERROR,
          errorMessage: message,
        },
        include: { items: { orderBy: { ordem: 'asc' } } },
      });

      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'Invoice',
        entityId: updated.id,
        action: AuditAction.UPDATE,
        before: toAuditSnapshot(draft),
        after: toAuditSnapshot(updated),
        reason: `Falha na emissão: ${message}`,
      });

      return toEntity(updated);
    }
  }

  async cancel(
    actor: AuditActor,
    invoiceId: string,
    motivo: string,
  ): Promise<InvoiceEntity> {
    const companyId = actor.companyId;

    if (!motivo || motivo.trim().length < 15) {
      throw new BadRequestException(
        'Motivo de cancelamento deve ter ao menos 15 caracteres (exigência SEFAZ).',
      );
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: { orderBy: { ordem: 'asc' } } },
    });
    if (!invoice || invoice.companyId !== companyId) {
      throw new NotFoundException('Nota fiscal não encontrada.');
    }
    if (invoice.status !== InvoiceStatus.AUTHORIZED) {
      throw new BadRequestException(
        'Só é possível cancelar notas autorizadas.',
      );
    }
    if (!invoice.providerRef) {
      throw new BadRequestException(
        'Nota sem referência do provedor — não é possível cancelar.',
      );
    }

    const config = await this.prisma.companyFiscalConfig.findUnique({
      where: { companyId },
    });
    if (!config) {
      throw new BadRequestException('Empresa sem configuração fiscal.');
    }

    const provider = this.providers.resolve(invoice.providerName ?? config.providerName);
    if (!provider) {
      throw new BadRequestException(
        `Provedor "${invoice.providerName}" não está registrado.`,
      );
    }

    const result = await provider.cancel(
      invoice.providerRef,
      motivo.trim(),
      buildIssuerConfig(config),
    );

    const updated = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: result.status,
        motivoCancelamento: motivo.trim(),
        protocoloCancelamento: result.protocoloCancelamento ?? null,
        dataCancelamento: result.dataCancelamento ?? new Date(),
        errorMessage: result.errorMessage ?? null,
        errorCode: result.errorCode ?? null,
        providerRawJson:
          (result.raw as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
      include: { items: { orderBy: { ordem: 'asc' } } },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Invoice',
      entityId: updated.id,
      action: AuditAction.REVERT,
      before: toAuditSnapshot(invoice),
      after: toAuditSnapshot(updated),
      reason: `Cancelamento da nota: ${motivo.trim()}`,
    });

    return toEntity(updated);
  }

  async resync(actor: AuditActor, invoiceId: string): Promise<InvoiceEntity> {
    const companyId = actor.companyId;

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: { orderBy: { ordem: 'asc' } } },
    });
    if (!invoice || invoice.companyId !== companyId) {
      throw new NotFoundException('Nota fiscal não encontrada.');
    }
    if (!invoice.providerRef) {
      throw new BadRequestException(
        'Nota sem referência do provedor — nada para sincronizar.',
      );
    }

    const config = await this.prisma.companyFiscalConfig.findUnique({
      where: { companyId },
    });
    if (!config) {
      throw new BadRequestException('Empresa sem configuração fiscal.');
    }

    const provider = this.providers.resolve(invoice.providerName ?? config.providerName);
    if (!provider) {
      throw new BadRequestException(
        `Provedor "${invoice.providerName}" não está registrado.`,
      );
    }

    const result = await provider.fetch(
      invoice.providerRef,
      buildIssuerConfig(config),
    );

    const updated = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: result.status,
        chaveAcesso: result.chaveAcesso ?? invoice.chaveAcesso,
        protocoloAutorizacao:
          result.protocoloAutorizacao ?? invoice.protocoloAutorizacao,
        xmlUrl: result.xmlUrl ?? invoice.xmlUrl,
        danfeUrl: result.danfeUrl ?? invoice.danfeUrl,
        errorMessage: result.errorMessage ?? invoice.errorMessage,
        errorCode: result.errorCode ?? invoice.errorCode,
        providerRawJson:
          (result.raw as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
      include: { items: { orderBy: { ordem: 'asc' } } },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Invoice',
      entityId: updated.id,
      action: AuditAction.UPDATE,
      before: toAuditSnapshot(invoice),
      after: toAuditSnapshot(updated),
      reason: 'Ressincronização com provedor.',
    });

    return toEntity(updated);
  }

  async handleProviderWebhook(
    providerName: string,
    payload: unknown,
    signatureHeader?: string | null,
  ): Promise<{ ok: boolean; invoiceId?: string }> {
    const provider: InvoiceProvider | null = this.providers.resolve(providerName);
    if (!provider) {
      this.logger.warn(`Webhook recebido para provider desconhecido: ${providerName}`);
      return { ok: false };
    }

    const config = await this.prisma.companyFiscalConfig.findFirst({
      where: { providerName },
    });
    const event = provider.parseWebhook(
      payload,
      signatureHeader ?? null,
      config?.providerWebhookSecret ?? null,
    );
    if (!event) {
      this.logger.warn(`Webhook ${providerName}: payload não reconhecido`);
      return { ok: false };
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { providerRef: event.providerRef, providerName },
      include: { items: { orderBy: { ordem: 'asc' } } },
    });
    if (!invoice) {
      this.logger.warn(
        `Webhook ${providerName}: invoice não encontrada para ref ${event.providerRef}`,
      );
      return { ok: false };
    }

    const updated = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: event.status,
        chaveAcesso: event.chaveAcesso ?? invoice.chaveAcesso,
        protocoloAutorizacao:
          event.protocoloAutorizacao ?? invoice.protocoloAutorizacao,
        protocoloCancelamento:
          event.protocoloCancelamento ?? invoice.protocoloCancelamento,
        xmlUrl: event.xmlUrl ?? invoice.xmlUrl,
        danfeUrl: event.danfeUrl ?? invoice.danfeUrl,
        errorMessage: event.errorMessage ?? invoice.errorMessage,
        errorCode: event.errorCode ?? invoice.errorCode,
        dataAutorizacao:
          event.status === InvoiceStatus.AUTHORIZED && !invoice.dataAutorizacao
            ? new Date()
            : invoice.dataAutorizacao,
        dataCancelamento:
          event.status === InvoiceStatus.CANCELED && !invoice.dataCancelamento
            ? new Date()
            : invoice.dataCancelamento,
      },
      include: { items: { orderBy: { ordem: 'asc' } } },
    });

    await this.audit.log({
      companyId: invoice.companyId,
      userId: null,
      entity: 'Invoice',
      entityId: updated.id,
      action: AuditAction.UPDATE,
      before: toAuditSnapshot(invoice),
      after: toAuditSnapshot(updated),
      reason: `Webhook do provedor ${providerName}.`,
    });

    return { ok: true, invoiceId: invoice.id };
  }

  private async reserveNextNumero(
    configId: string,
    type: InvoiceType,
  ): Promise<{ numero: number; serie: number }> {
    const { serieField, numeroField } = pickSerieAndNumeroFields(type);
    const result = await this.prisma.$transaction(async (tx) => {
      const config = await tx.companyFiscalConfig.findUnique({
        where: { id: configId },
      });
      if (!config) {
        throw new NotFoundException('Configuração fiscal removida.');
      }
      const numero = config[numeroField];
      const serie = config[serieField];
      await tx.companyFiscalConfig.update({
        where: { id: configId },
        data: { [numeroField]: numero + 1 },
      });
      return { numero, serie };
    });
    return result;
  }
}
