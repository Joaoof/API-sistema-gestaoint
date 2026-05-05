import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { UpsertCompanySettingsInput } from '../dto/upsert-company-settings.input';
import { CompanySettingsEntity } from '../entities/company-settings.entity';

type RawSettings = Prisma.CompanySettingsGetPayload<{}>;

function toEntity(raw: RawSettings): CompanySettingsEntity {
  return {
    id: raw.id,
    companyId: raw.companyId,
    currency: raw.currency,
    locale: raw.locale,
    timezone: raw.timezone,
    dateFormat: raw.dateFormat,
    timeFormat: raw.timeFormat,
    numberDecimals: raw.numberDecimals,
    numberDecimalSep: raw.numberDecimalSep,
    numberThousandSep: raw.numberThousandSep,
    weekStartsOn: raw.weekStartsOn,
    fiscalYearStartMonth: raw.fiscalYearStartMonth,
    defaultPageSize: raw.defaultPageSize,
    companyWhatsappNumber: raw.companyWhatsappNumber,
    companyWhatsappName: raw.companyWhatsappName,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

@Injectable()
export class CompanySettingsUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async getOrCreate(companyId: string): Promise<CompanySettingsEntity> {
    const existing = await this.prisma.companySettings.findUnique({
      where: { companyId },
    });
    if (existing) return toEntity(existing);
    const created = await this.prisma.companySettings.create({
      data: { companyId },
    });
    return toEntity(created);
  }

  async upsert(
    actor: AuditActor,
    input: UpsertCompanySettingsInput,
  ): Promise<CompanySettingsEntity> {
    const before = await this.prisma.companySettings.findUnique({
      where: { companyId: actor.companyId },
    });

    const data = {
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.locale !== undefined ? { locale: input.locale } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      ...(input.dateFormat !== undefined ? { dateFormat: input.dateFormat } : {}),
      ...(input.timeFormat !== undefined ? { timeFormat: input.timeFormat } : {}),
      ...(input.numberDecimals !== undefined
        ? { numberDecimals: input.numberDecimals }
        : {}),
      ...(input.numberDecimalSep !== undefined
        ? { numberDecimalSep: input.numberDecimalSep }
        : {}),
      ...(input.numberThousandSep !== undefined
        ? { numberThousandSep: input.numberThousandSep }
        : {}),
      ...(input.weekStartsOn !== undefined
        ? { weekStartsOn: input.weekStartsOn }
        : {}),
      ...(input.fiscalYearStartMonth !== undefined
        ? { fiscalYearStartMonth: input.fiscalYearStartMonth }
        : {}),
      ...(input.defaultPageSize !== undefined
        ? { defaultPageSize: input.defaultPageSize }
        : {}),
      ...(input.companyWhatsappNumber !== undefined
        ? { companyWhatsappNumber: input.companyWhatsappNumber }
        : {}),
      ...(input.companyWhatsappName !== undefined
        ? { companyWhatsappName: input.companyWhatsappName }
        : {}),
    };

    const updated = await this.prisma.companySettings.upsert({
      where: { companyId: actor.companyId },
      create: { companyId: actor.companyId, ...data },
      update: data,
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'CompanySettings',
      entityId: updated.id,
      action: before ? AuditAction.UPDATE : AuditAction.CREATE,
      before: before ?? undefined,
      after: updated,
    });

    return toEntity(updated);
  }
}
