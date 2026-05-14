import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * AES-256-GCM para guardar segredos por empresa (token IA, Typebot, etc).
 *
 * Formato persistido (string única, base64): `<iv>:<authTag>:<ciphertext>`
 * Cada parte em base64. Versão da chave em prefixo `v1:` pra rotação futura.
 *
 * Requer `ENCRYPTION_KEY` no env — 32 bytes em hex (64 chars).
 * Gere com:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — recomendado para GCM
const VERSION = 'v1';

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error('ENCRYPTION_KEY não definida no .env (32 bytes hex)');
  }
  if (hex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY tem ${hex.length} chars; esperado 64 (32 bytes hex)`,
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encryptSecret(plain: string): string {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('encryptSecret: plain vazio');
  }
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ct.toString('base64'),
  ].join(':');
}

export function decryptSecret(payload: string): string {
  if (!payload || typeof payload !== 'string') {
    throw new Error('decryptSecret: payload inválido');
  }
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('decryptSecret: formato/versão inesperado');
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

/**
 * Para mostrar na UI sem expor o token: "••••••4f2a".
 * Devolve string segura mesmo se o input for curto.
 */
export function maskSecret(plain: string, visible = 4): string {
  if (!plain) return '';
  const tail = plain.slice(-visible);
  return '••••••' + tail;
}

/**
 * Helpers pra criptografar/decifrar valores selecionados num objeto JSON
 * antes de salvar/ler do banco. Não-destrutivo (retorna cópia).
 */
export function encryptJsonFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const out: Record<string, unknown> = { ...obj };
  for (const f of fields) {
    const v = out[f as string];
    if (typeof v === 'string' && v.length > 0) {
      out[f as string] = encryptSecret(v);
    }
  }
  return out as T;
}

export function decryptJsonFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const out: Record<string, unknown> = { ...obj };
  for (const f of fields) {
    const v = out[f as string];
    if (typeof v === 'string' && v.startsWith(VERSION + ':')) {
      out[f as string] = decryptSecret(v);
    }
  }
  return out as T;
}
