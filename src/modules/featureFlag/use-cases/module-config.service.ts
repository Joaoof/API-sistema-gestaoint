import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  decryptJsonFields,
  encryptJsonFields,
  maskSecret,
} from '../../../shared/crypto/crypto.util';
import { FeatureFlagService } from './feature-flag.service';

/**
 * Mapa de campos sensíveis por `module_key`.
 * Esses campos são criptografados antes de salvar no `config` Json.
 * Devem ser conhecidos no backend; o front nunca recebe o valor decifrado.
 */
const SECRET_FIELDS_BY_MODULE: Record<string, string[]> = {
  ai_assistant: ['apiKey'],            // chave OpenAI/Anthropic
  chatbot_typebot: ['apiToken'],       // token Typebot
  whatsapp: ['accessToken', 'apiKey'], // tokens Cloud API
  whatsapp_session: ['apiToken'],
};

export type PublicConfigField =
  | { key: string; type: 'plain'; value: string | number | boolean | null }
  | { key: string; type: 'secret'; hasValue: boolean; hint: string | null };

@Injectable()
export class ModuleConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlag: FeatureFlagService,
  ) {}

  private secretFields(module_key: string): string[] {
    return SECRET_FIELDS_BY_MODULE[module_key] ?? [];
  }

  /**
   * Retorna o config "público" (campos secretos vêm mascarados com hint do
   * último valor + flag hasValue) para a UI do SuperAdmin.
   */
  async getPublicConfig(
    companyId: string,
    module_key: string,
  ): Promise<PublicConfigField[]> {
    const row = await this.prisma.companyModuleOverride.findUnique({
      where: { companyId_module_key: { companyId, module_key } },
    });
    if (!row || !row.config) return [];

    const secrets = new Set(this.secretFields(module_key));
    const obj = row.config as Record<string, unknown>;
    const out: PublicConfigField[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (secrets.has(k)) {
        // valor está cifrado — decripta só pro hint dos últimos 4 chars
        let hint: string | null = null;
        try {
          if (typeof v === 'string' && v.length > 0) {
            const plain = decryptJsonFields(
              { tmp: v } as Record<string, unknown>,
              ['tmp'],
            ).tmp as string;
            hint = maskSecret(plain);
          }
        } catch {
          hint = null; // corrompido / chave rodada
        }
        out.push({
          key: k,
          type: 'secret',
          hasValue: typeof v === 'string' && v.length > 0,
          hint,
        });
      } else {
        out.push({
          key: k,
          type: 'plain',
          value: v as string | number | boolean | null,
        });
      }
    }
    return out;
  }

  /**
   * Substitui o config. Campos secretos vindo `null/undefined` = mantém o atual.
   * Para realmente apagar um secret, passe string vazia "".
   */
  async setConfig(
    companyId: string,
    module_key: string,
    incoming: Record<string, unknown>,
  ) {
    const existing = await this.prisma.companyModuleOverride.findUnique({
      where: { companyId_module_key: { companyId, module_key } },
    });

    const previous: Record<string, unknown> =
      (existing?.config as Record<string, unknown>) ?? {};

    const secrets = new Set(this.secretFields(module_key));
    const merged: Record<string, unknown> = { ...previous };

    for (const [k, v] of Object.entries(incoming)) {
      if (secrets.has(k)) {
        if (v === undefined || v === null) continue; // manter
        if (typeof v !== 'string') {
          throw new BadRequestException(
            `Campo secreto ${k} precisa ser string`,
          );
        }
        if (v === '') {
          delete merged[k]; // apaga
        } else {
          // criptografa o valor plain
          merged[k] = encryptJsonFields({ tmp: v }, ['tmp']).tmp;
        }
      } else {
        merged[k] = v;
      }
    }

    const configJson = merged as Prisma.InputJsonValue;
    const saved = await this.prisma.companyModuleOverride.upsert({
      where: { companyId_module_key: { companyId, module_key } },
      update: { config: configJson },
      create: {
        companyId,
        module_key,
        enabled: true,
        config: configJson,
      },
    });

    await this.featureFlag.invalidate(companyId);
    return saved;
  }

  /**
   * Uso interno (resolvers da IA, do chatbot): retorna o config DECIFRADO.
   * NUNCA expor isso via GraphQL.
   */
  async getDecryptedConfig(
    companyId: string,
    module_key: string,
  ): Promise<Record<string, unknown> | null> {
    const row = await this.prisma.companyModuleOverride.findUnique({
      where: { companyId_module_key: { companyId, module_key } },
    });
    if (!row || !row.config) return null;
    if (!row.enabled) {
      throw new NotFoundException(
        `Módulo ${module_key} desabilitado pra empresa ${companyId}`,
      );
    }
    const obj = row.config as Record<string, unknown>;
    const secrets = this.secretFields(module_key);
    return decryptJsonFields(obj, secrets as never);
  }
}
