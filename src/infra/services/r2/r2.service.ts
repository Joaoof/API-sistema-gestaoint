import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export interface SignUploadInput {
  filename: string;
  contentType: string;
  size: number;
  folder?: string;
}

export interface SignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

@Injectable()
export class R2Service implements OnModuleInit {
  private readonly logger = new Logger(R2Service.name);
  private client!: S3Client;
  private bucket!: string;
  private publicBase!: string;
  private presignTtl!: number;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const endpoint = this.config.getOrThrow<string>('R2_ENDPOINT');
    const accessKeyId = this.config.getOrThrow<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.getOrThrow<string>(
      'R2_SECRET_ACCESS_KEY',
    );

    this.bucket = this.config.getOrThrow<string>('R2_BUCKET');
    this.publicBase =
      this.config.get<string>('R2_PUBLIC_BASE') ?? `${endpoint}/${this.bucket}`;
    this.presignTtl = Number(this.config.get('R2_PRESIGN_TTL') ?? 600);

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      // R2 usa path-style URLs
      forcePathStyle: true,
    });

    this.logger.log(
      `R2 inicializado: bucket=${this.bucket} ttl=${this.presignTtl}s`,
    );
  }

  /**
   * Valida o input antes de gerar URL assinada.
   */
  validateInput({ contentType, size }: SignUploadInput): void {
    if (!ALLOWED_MIME.has(contentType)) {
      throw new Error(
        `Content-Type não suportado. Aceitos: ${[...ALLOWED_MIME].join(', ')}`,
      );
    }
    if (size <= 0 || size > MAX_BYTES) {
      throw new Error(
        `Tamanho inválido. Limite ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB.`,
      );
    }
  }

  /**
   * Gera uma key única e estável: products/uuid-nome-original.ext
   */
  buildKey(folder: string, filename: string): string {
    const ext = extname(filename) || '';
    const base = slugify(filename.replace(ext, '')) || 'file';
    return `${folder}/${randomUUID()}-${base}${ext.toLowerCase()}`;
  }

  /**
   * Gera URL pré-assinada para PUT direto no R2.
   * Frontend faz: fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })
   */
  async signUpload(input: SignUploadInput): Promise<SignedUploadResult> {
    this.validateInput(input);

    const folder = (input.folder ?? 'misc').replace(/[^a-z0-9-]/gi, '');
    const key = this.buildKey(folder, input.filename);

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: input.contentType,
      ContentLength: input.size,
      // Content-Length na URL assinada — força client a respeitar o tamanho
      Metadata: { 'original-filename': encodeURIComponent(input.filename) },
    });

    const uploadUrl = await getSignedUrl(this.client, cmd, {
      expiresIn: this.presignTtl,
    });

    return {
      uploadUrl,
      publicUrl: `${this.publicBase}/${key}`,
      key,
      expiresIn: this.presignTtl,
    };
  }

  /**
   * Remove um asset do bucket.
   */
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Removido: ${key}`);
  }

  /**
   * Constrói URL pública a partir de uma key existente.
   */
  publicUrlFor(key: string): string {
    return `${this.publicBase}/${key}`;
  }
}
