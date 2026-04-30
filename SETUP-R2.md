# Setup Cloudflare R2 + Product Module

Esse guia descreve o que foi adicionado e os passos de instalação.

## 1) Dependências

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

A AWS SDK v3 fala com R2 nativamente — Cloudflare implementa a API S3.

## 2) Variáveis de ambiente

Copie `.env.example` para `.env` e preencha as variáveis R2:

```env
R2_ENDPOINT=https://a252dc75a2305508290f0658d1fb21b2.r2.cloudflarestorage.com
R2_BUCKET=gestao-int
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_BASE=                # opcional (custom domain)
R2_PRESIGN_TTL=600
```

### Como gerar `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`:

1. Cloudflare Dashboard → **R2** → **Manage R2 API Tokens**
2. **Create API Token**
3. Permissions: **Object Read & Write**
4. Bucket: `gestao-int`
5. TTL: o que preferir (sem expiração para servidor de produção)
6. Copie `Access Key ID` e `Secret Access Key`

### CORS no bucket (obrigatório p/ frontend fazer PUT direto)

Cloudflare Dashboard → R2 → bucket `gestao-int` → **Settings** → **CORS Policy**:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://gestaoint.netlify.app"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Adicione domínios de produção depois.

### URL pública (opcional)

Para servir as imagens em CDN customizado (`cdn.seudominio.com.br`):
1. R2 → bucket → **Settings** → **Public Access** → **Connect Domain**
2. Setar `R2_PUBLIC_BASE=https://cdn.seudominio.com.br`

Sem isso, as URLs públicas usam o endpoint padrão R2.

## 3) Migration Prisma

Schema atualizado: novo model `ProductImage` + campos extras em `Product` (`sku`, `unit`, `minStock`, `weight`, `images`).

```bash
npx prisma migrate dev --name add_product_images
npx prisma generate
```

## 4) Endpoints expostos

### REST

- `POST /api/storage/sign` — auth: JWT Bearer
  - Body: `{ filename, contentType, size, folder? }`
  - Retorna: `{ uploadUrl, publicUrl, key, expiresIn }`
  - Frontend faz `PUT uploadUrl` direto no R2 com o arquivo
- `DELETE /api/storage/:key` — remove asset

### GraphQL

- `Query products(search, categoryId, status, take, skip): [Product!]!`
- `Mutation createProductMutation(input: CreateProductInput!): Product!`
- `Mutation deleteProductMutation(id: String!): Boolean!`

## 5) Fluxo end-to-end

```
[Frontend]                              [Backend]                    [Cloudflare R2]
   │                                       │                              │
   ├─ POST /api/storage/sign ──────────────▶│                              │
   │                                       ├─ getSignedUrl (PutObject)    │
   │   { uploadUrl, publicUrl, key }      │                              │
   │◀──────────────────────────────────────┤                              │
   │                                       │                              │
   ├─ PUT uploadUrl (file) ─────────────────────────────────────────────▶│
   │                                                                      │
   │   200 OK                                                             │
   │◀─────────────────────────────────────────────────────────────────────│
   │                                                                      │
   ├─ Mutation createProductMutation ──────▶│                              │
   │     input.images: [{ url, key, ... }] │                              │
   │                                       ├─ Prisma create Product       │
   │                                       │     + nested ProductImage    │
   │                                       │                              │
   │   Product { id, ..., images[] }      │                              │
   │◀──────────────────────────────────────┤                              │
```

## 6) Observabilidade

Em caso de falha após o upload (ex: a mutation `createProductMutation` falhar), o `CreateProductUseCase` chama `r2.delete(key)` em best-effort para evitar arquivos órfãos no bucket. Falhas de remoção viram warning, não bloqueiam.

## 7) Como rodar

```bash
# 1. instalar deps
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# 2. configurar .env (copiar de .env.example)
cp .env.example .env

# 3. aplicar migration
npx prisma migrate dev --name add_product_images
npx prisma generate

# 4. iniciar
npm run start:dev
```
