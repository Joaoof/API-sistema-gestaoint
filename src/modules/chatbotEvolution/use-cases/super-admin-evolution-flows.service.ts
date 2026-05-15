import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

export type EvolutionFlowDto = {
  id: string;
  companyId: string;
  name: string;
  trigger: string;
  pattern: string | null;
  responseBody: string;
  priority: number;
  enabled: boolean;
  cooldownMinutes: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class SuperAdminEvolutionFlowsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string): Promise<EvolutionFlowDto[]> {
    const rows = await this.prisma.whatsappChatbotRule.findMany({
      where: { companyId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(this.toDto);
  }

  async create(input: {
    companyId: string;
    name: string;
    trigger: string;
    pattern?: string | null;
    responseBody: string;
    priority?: number;
    enabled?: boolean;
    cooldownMinutes?: number;
  }): Promise<EvolutionFlowDto> {
    const row = await this.prisma.whatsappChatbotRule.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        trigger: input.trigger,
        pattern: input.pattern ?? null,
        responseBody: input.responseBody,
        priority: input.priority ?? 100,
        enabled: input.enabled ?? true,
        applyTags: [],
        cooldownMinutes: input.cooldownMinutes ?? 60,
      },
    });
    return this.toDto(row);
  }

  async update(
    companyId: string,
    id: string,
    patch: Partial<{
      name: string;
      trigger: string;
      pattern: string | null;
      responseBody: string;
      priority: number;
      enabled: boolean;
      cooldownMinutes: number;
    }>,
  ): Promise<EvolutionFlowDto> {
    const exists = await this.prisma.whatsappChatbotRule.findFirst({
      where: { id, companyId },
    });
    if (!exists) throw new NotFoundException('Regra não existe para essa empresa.');
    const row = await this.prisma.whatsappChatbotRule.update({
      where: { id },
      data: patch as any,
    });
    return this.toDto(row);
  }

  async remove(companyId: string, id: string): Promise<boolean> {
    const exists = await this.prisma.whatsappChatbotRule.findFirst({
      where: { id, companyId },
    });
    if (!exists) return false;
    await this.prisma.whatsappChatbotRule.delete({ where: { id } });
    return true;
  }

  private toDto = (r: {
    id: string; companyId: string; name: string; trigger: string;
    pattern: string | null; responseBody: string; priority: number;
    enabled: boolean; cooldownMinutes: number; createdAt: Date; updatedAt: Date;
  }): EvolutionFlowDto => ({
    id: r.id,
    companyId: r.companyId,
    name: r.name,
    trigger: r.trigger,
    pattern: r.pattern,
    responseBody: r.responseBody,
    priority: r.priority,
    enabled: r.enabled,
    cooldownMinutes: r.cooldownMinutes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });
}
