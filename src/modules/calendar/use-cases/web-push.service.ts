import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../prisma/prisma.service';

/**
 * Implementação enxuta de Web Push (RFC 8030 + RFC 8291) usando apenas crypto nativo.
 *
 * Requer duas variáveis de ambiente:
 *   - VAPID_PUBLIC_KEY  (base64url, 65 bytes uncompressed P-256)
 *   - VAPID_PRIVATE_KEY (base64url, 32 bytes scalar)
 *   - VAPID_SUBJECT     (mailto:contato@empresa.com.br)
 *
 * Para gerar: rode uma vez `node -e "const {generateKeyPairSync} = require('crypto'); const {publicKey, privateKey} = generateKeyPairSync('ec', { namedCurve: 'P-256' }); console.log('public', publicKey.export({type:'spki', format:'der'}).slice(-65).toString('base64url')); console.log('private', privateKey.export({type:'pkcs8', format:'der'}).slice(36, 36+32).toString('base64url'));"`
 *
 * Se as keys não estiverem configuradas, o serviço apenas loga e retorna ok=false
 * sem quebrar o fluxo — útil em dev.
 */
@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly publicKey = process.env.VAPID_PUBLIC_KEY;
  private readonly privateKey = process.env.VAPID_PRIVATE_KEY;
  private readonly subject =
    process.env.VAPID_SUBJECT ?? 'mailto:no-reply@gestaoint.com.br';

  constructor(private readonly prisma: PrismaService) {}

  isConfigured(): boolean {
    return !!(this.publicKey && this.privateKey);
  }

  getPublicKey(): string | null {
    return this.publicKey ?? null;
  }

  async sendToUser(args: {
    companyId: string;
    userId: string | null;
    title: string;
    body: string;
    url?: string;
    tag?: string;
  }): Promise<{ sent: number; failed: number }> {
    const subs = await this.prisma.pushSubscription.findMany({
      where: {
        companyId: args.companyId,
        ...(args.userId ? { userId: args.userId } : {}),
      },
    });

    if (subs.length === 0) return { sent: 0, failed: 0 };
    if (!this.isConfigured()) {
      this.logger.warn(
        `Web Push não configurado (VAPID_PUBLIC_KEY/PRIVATE_KEY). ${subs.length} sub(s) ignoradas.`,
      );
      return { sent: 0, failed: subs.length };
    }

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url ?? '/calendario',
      tag: args.tag,
      timestamp: Date.now(),
    });

    let sent = 0;
    let failed = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await this.sendRaw(
            { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
            payload,
          );
          await this.prisma.pushSubscription.update({
            where: { id: s.id },
            data: { lastUsed: new Date() },
          });
          sent++;
        } catch (err: any) {
          failed++;
          const msg = err?.message ?? String(err);
          this.logger.warn(`push falhou (${s.endpoint.slice(0, 60)}…): ${msg}`);
          // 404/410 = endpoint expirado, remover
          if (/410|404/.test(msg)) {
            await this.prisma.pushSubscription
              .delete({ where: { id: s.id } })
              .catch(() => undefined);
          }
        }
      }),
    );
    return { sent, failed };
  }

  // -----------------------------------------------------------------
  // RFC 8291 — aes128gcm content encoding (versão simplificada).
  // -----------------------------------------------------------------

  private async sendRaw(
    sub: { endpoint: string; p256dh: string; auth: string },
    payload: string,
  ): Promise<void> {
    const ttl = 60;
    const aud = new URL(sub.endpoint).origin;
    const vapidHeaders = this.buildVapidHeaders(aud);

    const encrypted = this.encryptPayload(sub.p256dh, sub.auth, Buffer.from(payload, 'utf8'));

    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        TTL: String(ttl),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        Urgency: 'high',
        ...vapidHeaders,
      },
      body: new Blob([new Uint8Array(encrypted)]),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
  }

  private buildVapidHeaders(audience: string): Record<string, string> {
    const header = b64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const claims = b64url(
      Buffer.from(
        JSON.stringify({
          aud: audience,
          exp: Math.floor(Date.now() / 1000) + 12 * 3600,
          sub: this.subject,
        }),
      ),
    );

    const signInput = `${header}.${claims}`;
    const privKey = derFromRawPrivate(b64urlDecode(this.privateKey!));
    const sig = crypto.sign('SHA256', Buffer.from(signInput), {
      key: privKey,
      dsaEncoding: 'ieee-p1363',
    });
    const jwt = `${signInput}.${b64url(sig)}`;

    return {
      Authorization: `vapid t=${jwt}, k=${this.publicKey}`,
    };
  }

  private encryptPayload(
    p256dh: string,
    authSecret: string,
    payload: Buffer,
  ): Buffer {
    const clientPub = b64urlDecode(p256dh);
    const authBuf = b64urlDecode(authSecret);

    const ecdh = crypto.createECDH('prime256v1');
    ecdh.generateKeys();
    const localPub = ecdh.getPublicKey();
    const sharedSecret = ecdh.computeSecret(clientPub);

    // PRK_key = HKDF(auth_secret, ecdh_secret, "WebPush: info" || 0x00 || ua_public || as_public, 32)
    const keyInfo = Buffer.concat([
      Buffer.from('WebPush: info\0'),
      clientPub,
      localPub,
    ]);
    const prk = hkdf(authBuf, sharedSecret, keyInfo, 32);

    const salt = crypto.randomBytes(16);

    // CEK = HKDF(salt, prk, "Content-Encoding: aes128gcm\0", 16)
    const cek = hkdf(salt, prk, Buffer.from('Content-Encoding: aes128gcm\0'), 16);

    // NONCE = HKDF(salt, prk, "Content-Encoding: nonce\0", 12)
    const nonce = hkdf(salt, prk, Buffer.from('Content-Encoding: nonce\0'), 12);

    // padding (0x02 = last record terminator)
    const padded = Buffer.concat([payload, Buffer.from([0x02])]);

    const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
    const ciphertext = Buffer.concat([cipher.update(padded), cipher.final()]);
    const tag = cipher.getAuthTag();

    // header: salt(16) | rs(4 BE) | idlen(1) | keyid(idlen)
    const rs = Buffer.alloc(4);
    rs.writeUInt32BE(4096, 0);
    const idlen = Buffer.from([localPub.length]);
    const header = Buffer.concat([salt, rs, idlen, localPub]);

    return Buffer.concat([header, ciphertext, tag]);
  }
}

// ----------------- utils ---------------------

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
  const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
  let t = Buffer.alloc(0);
  let out = Buffer.alloc(0);
  let i = 1;
  while (out.length < length) {
    t = crypto
      .createHmac('sha256', prk)
      .update(Buffer.concat([t, info, Buffer.from([i++])]))
      .digest();
    out = Buffer.concat([out, t]);
  }
  return out.slice(0, length);
}

/**
 * Converte uma chave privada P-256 raw (32 bytes) em formato DER PKCS8
 * para uso com crypto.sign().
 */
function derFromRawPrivate(raw: Buffer): crypto.KeyObject {
  // PKCS8 envelope para chave privada EC P-256 (32 bytes de escalar).
  // Estrutura DER short-form (RFC 5208 + RFC 5915):
  //  30 41 (SEQ 65 bytes) | 02 01 00 | 30 13 [algo: ecPublicKey + prime256v1]
  //   | 04 27 (octet) | 30 25 [ECPrivateKey wrapper] | 02 01 01 | 04 20 [32 raw bytes]
  if (raw.length !== 32) {
    throw new Error(`VAPID_PRIVATE_KEY inválida (esperado 32 bytes, recebeu ${raw.length}).`);
  }
  const pkcs8Header = Buffer.from(
    '3041020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420',
    'hex',
  );
  const der = Buffer.concat([pkcs8Header, raw]);
  return crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
}
