<div align="center">

# 🏢 API Sistema GestãoInt

### **Enterprise-Grade Internal Management System API**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.13.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white)](https://graphql.org/)
[![Redis](https://img.shields.io/badge/Redis-5.5.6-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-UNLICENSED-red?style=for-the-badge)](LICENSE)

**Uma solução backend robusta, escalável e sustentável para gestão organizacional completa**

[📚 Documentação](#-documentação) • [🚀 Início Rápido](#-início-rápido) • [🏗️ Arquitetura](#️-arquitetura) • [🔧 API Reference](#-api-reference) • [🧪 Testes](#-testes)

</div>

---

## 📑 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Características Principais](#-características-principais)
- [Stack Tecnológica](#️-stack-tecnológica)
- [Arquitetura](#️-arquitetura)
- [Início Rápido](#-início-rápido)
- [Configuração](#️-configuração)
- [Modelo de Dados](#-modelo-de-dados)
- [API Reference](#-api-reference)
- [Autenticação](#-autenticação)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Performance](#-performance)
- [Segurança](#-segurança)
- [Contribuindo](#-contribuindo)
- [Roadmap](#-roadmap)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

A **API Sistema GestãoInt** é uma solução backend de **nível empresarial** construída com as melhores práticas de desenvolvimento moderno. Projetada para oferecer uma infraestrutura completa de gestão organizacional interna, a API combina **Clean Architecture**, **Domain-Driven Design (DDD)** e **SOLID principles** para garantir código sustentável, testável e escalável.

### 🎪 Casos de Uso

- 🏢 **Gestão Empresarial** - Controle completo de empresas e filiais
- 👥 **Gestão de Usuários** - Sistema robusto de autenticação e autorização
- 💰 **Movimentações Financeiras** - Controle de entradas e saídas
- 📦 **Gestão de Produtos** - Catálogo e inventário
- 📊 **Relatórios e Analytics** - Insights em tempo real
- 🔔 **Notificações** - Sistema de eventos e alertas
- 📈 **Planos e Assinaturas** - Gestão de planos empresariais

---

## ✨ Características Principais

### 🏗️ **Arquitetura & Design**

- ✅ **Clean Architecture** - Separação clara de responsabilidades
- ✅ **Domain-Driven Design (DDD)** - Modelagem focada no domínio
- ✅ **SOLID Principles** - Código sustentável e extensível
- ✅ **CQRS Pattern** - Separação de comandos e queries
- ✅ **Event-Driven** - Arquitetura orientada a eventos
- ✅ **Dependency Injection** - Baixo acoplamento

### 🔒 **Segurança**

- 🛡️ **JWT Authentication** - Tokens seguros e stateless
- 🔐 **Argon2 Hashing** - Algoritmo de hash resistente
- 🚦 **Rate Limiting** - Proteção contra abuso
- 🪖 **Helmet.js** - Headers de segurança HTTP
- 🔍 **Input Validation** - Validação com Zod
- 🚪 **Guards & Interceptors** - Controle de acesso granular

### 🚀 **Performance**

- ⚡ **Fastify** - Servidor HTTP de alta performance
- 💾 **Redis Cache** - Cache distribuído
- 📊 **Query Optimization** - Prisma ORM otimizado
- 🔄 **Connection Pooling** - Gerenciamento eficiente de conexões
- 📦 **Compression** - Compressão de respostas
- 🎯 **Response Time** - < 200ms em média

### 🧪 **Quality Assurance**

- ✅ **Unit Tests** - Testes unitários com Jest
- ✅ **Integration Tests** - Testes de integração
- ✅ **E2E Tests** - Testes end-to-end
- ✅ **Architecture Tests** - Validação de arquitetura
- ✅ **Code Coverage** - +80% de cobertura
- ✅ **CI/CD Pipeline** - GitHub Actions

### 📡 **APIs Modernas**

- 🌐 **REST API** - Endpoints RESTful documentados
- 🔮 **GraphQL API** - Queries flexíveis com Apollo
- 📖 **OpenAPI/Swagger** - Documentação interativa
- 🔄 **Real-time** - WebSockets e eventos
- 📨 **Background Jobs** - BullMQ para tarefas assíncronas

---

## 🛠️ Stack Tecnológica

### **Core Framework**

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **Node.js** | ≥18.x | Runtime JavaScript de alta performance |
| **NestJS** | ^11.0.1 | Framework progressivo para Node.js |
| **TypeScript** | ^5.7.3 | Superset tipado de JavaScript |
| **Fastify** | ^4.29.1 | Web framework extremamente rápido |

### **Database & ORM**

| Tecnologia | Versão | Função |
|------------|--------|--------|
| **PostgreSQL** | ≥14.x | Banco de dados relacional |
| **Prisma** | ^6.13.0 | ORM de próxima geração |
| **Redis** | ^5.5.6 | Cache e message broker |

### **APIs & Communication**

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **GraphQL** | ^16.11.0 | Query language para APIs |
| **Apollo Server** | ^3.13.0 | Servidor GraphQL |
| **Swagger/OpenAPI** | ^11.2.0 | Documentação de API |

### **Security & Authentication**

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Passport** | ^0.7.0 | Middleware de autenticação |
| **JWT** | ^11.0.0 | JSON Web Tokens |
| **Argon2** | ^0.43.1 | Hashing de senhas |
| **Helmet** | ^8.1.0 | Segurança HTTP headers |
| **Throttler** | ^6.4.0 | Rate limiting |

### **Background Jobs & Events**

| Tecnologia | Versão | Função |
|------------|--------|--------|
| **BullMQ** | ^5.54.2 | Gerenciamento de filas |
| **Event Emitter** | ^3.0.1 | Sistema de eventos |
| **CQRS** | ^11.0.3 | Command Query Responsibility Segregation |

### **Testing & Quality**

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Jest** | ^29.7.0 | Framework de testes |
| **Supertest** | ^7.0.0 | Testes HTTP |
| **ESLint** | ^9.18.0 | Linter de código |
| **Prettier** | ^3.4.2 | Formatador de código |

### **Utilities**

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Zod** | ^3.25.63 | Validação de schemas |
| **date-fns** | ^4.1.0 | Manipulação de datas |
| **Winston** | ^3.17.0 | Sistema de logs |
| **Nodemailer** | ^7.0.3 | Envio de emails |

---

## 🏗️ Arquitetura

### **📐 Clean Architecture + DDD**

A aplicação segue os princípios de **Clean Architecture** e **Domain-Driven Design**, garantindo separação clara de responsabilidades e independência de frameworks.

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ REST API     │  │ GraphQL API  │  │ WebSockets   │      │
│  │ Controllers  │  │ Resolvers    │  │ Gateways     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Use Cases    │  │ Commands     │  │ Queries      │      │
│  │ Services     │  │ Handlers     │  │ Handlers     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Entities     │  │ Value        │  │ Domain       │      │
│  │ Aggregates   │  │ Objects      │  │ Events       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Database     │  │ Cache        │  │ External     │      │
│  │ Repositories │  │ Redis        │  │ Services     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### **📂 Estrutura de Diretórios**

```
src/
├── 🏗️ core/                      # DOMAIN LAYER
│   ├── entities/                 # Entidades de negócio
│   │   ├── user.entity.ts
│   │   ├── company.entity.ts
│   │   └── cash-movement.entity.ts
│   ├── use-cases/                # Casos de uso
│   │   ├── create-user/
│   │   ├── authenticate-user/
│   │   └── register-movement/
│   ├── ports/                    # Interfaces/Contratos
│   │   ├── repositories/
│   │   └── services/
│   ├── dtos/                     # Data Transfer Objects
│   └── exceptions/               # Exceções de domínio
│
├── 🔧 infra/                     # INFRASTRUCTURE LAYER
│   ├── database/                 # Implementações de BD
│   │   ├── prisma/
│   │   ├── repositories/
│   │   └── migrations/
│   ├── services/                 # Serviços externos
│   │   ├── email/
│   │   └── storage/
│   ├── cache/                    # Redis cache
│   ├── graphql/                  # GraphQL schemas
│   │   ├── resolvers/
│   │   └── types/
│   └── filters/                  # Exception filters
│
├── 🌐 modules/                   # PRESENTATION LAYER
│   ├── auth/                     # Autenticação
│   │   ├── controllers/
│   │   ├── guards/
│   │   ├── strategies/
│   │   └── dto/
│   ├── user/                     # Gestão de usuários
│   │   ├── controllers/
│   │   ├── services/
│   │   └── dto/
│   ├── company/                  # Gestão de empresas
│   │   ├── controllers/
│   │   ├── services/
│   │   └── dto/
│   ├── cash-movement/            # Movimentações
│   │   ├── controllers/
│   │   ├── services/
│   │   └── dto/
│   ├── product/                  # Produtos
│   └── category/                 # Categorias
│
├── 🛠️ shared/                    # CROSS-CUTTING CONCERNS
│   ├── guards/                   # Security guards
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/             # Interceptors
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── decorators/               # Custom decorators
│   ├── dto/                      # DTOs compartilhados
│   ├── utils/                    # Utilitários
│   └── swagger/                  # Configuração Swagger
│
├── 🧪 tests__/                   # TEST SUITES
│   ├── unit/                     # Testes unitários
│   ├── integration/              # Testes de integração
│   ├── e2e/                      # End-to-end tests
│   └── architecture/             # Testes arquiteturais
│
├── app.module.ts                 # Módulo raiz
└── main.ts                       # Entry point
```

### **🎯 Princípios SOLID**

#### **S - Single Responsibility Principle**
Cada classe tem uma única responsabilidade bem definida.

```typescript
// ✅ BOM: Responsabilidade única
class UserRepository {
  async findById(id: string): Promise<User> { }
}

class UserValidator {
  validate(user: User): ValidationResult { }
}
```

#### **O - Open/Closed Principle**
Aberto para extensão, fechado para modificação.

```typescript
// ✅ BOM: Extensível via interface
interface PaymentStrategy {
  process(amount: number): Promise<void>;
}

class CreditCardPayment implements PaymentStrategy { }
class PixPayment implements PaymentStrategy { }
```

#### **L - Liskov Substitution Principle**
Subtipos devem ser substituíveis por seus tipos base.

```typescript
// ✅ BOM: Substituível
abstract class Repository<T> {
  abstract findById(id: string): Promise<T>;
}

class UserRepository extends Repository<User> { }
```

#### **I - Interface Segregation Principle**
Interfaces específicas são melhores que interfaces gerais.

```typescript
// ✅ BOM: Interfaces segregadas
interface Readable { read(): Promise<Data>; }
interface Writable { write(data: Data): Promise<void>; }
interface Deletable { delete(id: string): Promise<void>; }
```

#### **D - Dependency Inversion Principle**
Dependa de abstrações, não de implementações concretas.

```typescript
// ✅ BOM: Depende de abstração
class UserService {
  constructor(
    private readonly userRepository: IUserRepository, // Interface
    private readonly emailService: IEmailService,     // Interface
  ) {}
}
```

---

## 🚀 Início Rápido

### **📋 Pré-requisitos**

Certifique-se de ter instalado:

- **Node.js** ≥ 18.x ([Download](https://nodejs.org/))
- **npm** ou **yarn** ou **pnpm**
- **PostgreSQL** ≥ 14.x ([Download](https://www.postgresql.org/download/))
- **Redis** ≥ 6.x ([Download](https://redis.io/download))
- **Docker** (opcional, mas recomendado) ([Download](https://www.docker.com/))

### **⚡ Instalação Rápida**

```bash
# 1. Clone o repositório
git clone https://github.com/Joaoof/api-sistema-gestaoint.git
cd api-sistema-gestaoint

# 2. Instale as dependências
npm install
# ou
yarn install
# ou
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# 4. Execute as migrações do banco de dados
npx prisma migrate dev

# 5. (Opcional) Seed do banco de dados
npx prisma db seed

# 6. Inicie o servidor de desenvolvimento
npm run start:dev
```

### **🐳 Instalação com Docker**

```bash
# 1. Clone o repositório
git clone https://github.com/Joaoof/api-sistema-gestaoint.git
cd api-sistema-gestaoint

# 2. Configure as variáveis de ambiente
cp .env.example .env

# 3. Inicie os containers
docker-compose up -d

# 4. Execute as migrações
docker-compose exec api npx prisma migrate dev

# 5. Acesse a aplicação
# API: http://localhost:3000
# Swagger: http://localhost:3000/api
# GraphQL Playground: http://localhost:3000/graphql
```

### **✅ Verificação da Instalação**

```bash
# Verifique se a API está rodando
curl http://localhost:3000/health

# Resposta esperada:
# {"status":"ok","timestamp":"2025-09-30T12:00:00.000Z"}
```

---

## ⚙️ Configuração

### **🔐 Variáveis de Ambiente**

Crie um arquivo `.env` na raiz do projeto:

```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api
API_VERSION=v1

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gestaoint?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRATION=30d

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# Email (Nodemailer)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@gestaoint.com

# AWS S3 (opcional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name

# Monitoring (opcional)
SENTRY_DSN=your-sentry-dsn

# Logs
LOG_LEVEL=debug
```

### **🗄️ Configuração do Banco de Dados**

#### **PostgreSQL Local**

```bash
# Criar banco de dados
createdb gestaoint

# Executar migrações
npx prisma migrate dev

# Visualizar banco de dados
npx prisma studio
```

#### **PostgreSQL Docker**

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: gestaoint-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: gestaoint
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: gestaoint-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### **🔄 Migrações do Prisma**

```bash
# Criar uma nova migração
npx prisma migrate dev --name add_new_feature

# Aplicar migrações em produção
npx prisma migrate deploy

# Resetar banco de dados (CUIDADO!)
npx prisma migrate reset

# Gerar Prisma Client
npx prisma generate

# Visualizar banco de dados
npx prisma studio
```

---

## 📊 Modelo de Dados

### **🏢 Diagrama ER**

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Company   │────────<│    Users    │>────────│ CashMovement│
│             │         │             │         │             │
│ id          │         │ id          │         │ id          │
│ name        │         │ email       │         │ type        │
│ cnpj        │         │ password    │         │ category    │
│ email       │         │ name        │         │ value       │
│ phone       │         │ role        │         │ description │
│ address     │         │ company_id  │         │ user_id     │
│ logoUrl     │         │ is_active   │         │ date        │
│ is_active   │         │ createdAt   │         │ createdAt   │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │                        
       │                       │                        
       ▼                       ▼                        
┌─────────────┐         ┌─────────────┐         
│ CompanyPlan │         │   Product   │         
│             │         │             │         
│ id          │         │ id          │         
│ company_id  │         │ name        │         
│ plan_type   │         │ description │         
│ start_date  │         │ price       │         
│ end_date    │         │ category_id │         
│ is_active   │         │ user_id     │         
└─────────────┘         └─────────────┘         
                               │                 
                               ▼                 
                        ┌─────────────┐         
                        │  Category   │         
                        │             │         
                        │ id          │         
                        │ name        │         
                        │ description │         
                        │ user_id     │         
                        └─────────────┘         
```

### **📋 Entidades Principais**

#### **Users**

```prisma
model Users {
  id            String          @id @default(cuid())
  email         String          @unique
  password_hash String
  name          String
  company_id    String?
  role          String          @default("USER")
  is_active     Boolean         @default(true)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  
  // Relacionamentos
  company       Company?        @relation(fields: [company_id], references: [id])
  cashMovements CashMovement[]
  products      Product[]
  categories    Category[]
  
  @@index([email])
  @@index([company_id])
}
```

#### **Company**

```prisma
model Company {
  id          String        @id @default(cuid())
  name        String        @unique
  email       String?       @unique
  phone       String?
  address     String?
  cnpj        String?       @unique
  logoUrl     String?
  is_active   Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  // Relacionamentos
  users       Users[]
  companyPlan CompanyPlan?
  
  @@index([cnpj])
}
```

#### **CashMovement**

```prisma
enum MovementType {
  ENTRY
  EXIT
}

enum MovementCategory {
  SALE
  PURCHASE
  EXPENSE
  INVESTMENT
  TRANSFER
  OTHER
}

model CashMovement {
  id          String            @id @default(uuid())
  type        MovementType
  category    MovementCategory
  value       Decimal           @db.Decimal(10, 2)
  description String?
  date        DateTime          @default(now())
  user_id     String
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  
  // Relacionamentos
  user        Users             @relation(fields: [user_id], references: [id])
  
  @@index([user_id])
  @@index([date])
  @@index([type])
}
```

#### **Product**

```prisma
model Product {
  id          String    @id @default(cuid())
  name        String
  description String?
  price       Decimal   @db.Decimal(10, 2)
  stock       Int       @default(0)
  category_id String?
  user_id     String
  is_active   Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relacionamentos
  category    Category? @relation(fields: [category_id], references: [id])
  user        Users     @relation(fields: [user_id], references: [id])
  
  @@index([category_id])
  @@index([user_id])
}
```

#### **Category**

```prisma
model Category {
  id          String    @id @default(cuid())
  name        String
  description String?
  user_id     String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relacionamentos
  products    Product[]
  user        Users     @relation(fields: [user_id], references: [id])
  
  @@index([user_id])
}
```

#### **CompanyPlan**

```prisma
enum PlanType {
  FREE
  BASIC
  PREMIUM
  ENTERPRISE
}

model CompanyPlan {
  id         String    @id @default(cuid())
  company_id String    @unique
  plan_type  PlanType  @default(FREE)
  start_date DateTime  @default(now())
  end_date   DateTime?
  is_active  Boolean   @default(true)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  
  // Relacionamentos
  company    Company   @relation(fields: [company_id], references: [id])
  
  @@index([company_id])
}
```

---

## 🔧 API Reference

### **📡 REST API**

A API REST está disponível em `http://localhost:3000/api` e documentada com Swagger.

#### **Base URL**

```
http://localhost:3000/api/v1
```

#### **Autenticação**

Todas as rotas protegidas requerem um token JWT no header:

```http
Authorization: Bearer <seu-token-jwt>
```

### **🔐 Auth Endpoints**

#### **POST /auth/register**

Registra um novo usuário.

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "João Silva",
  "company_id": "optional-company-id"
}
```

**Response 201:**

```json
{
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "João Silva",
    "role": "USER",
    "is_active": true,
    "createdAt": "2025-09-30T12:00:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### **POST /auth/login**

Autentica um usuário existente.

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**

```json
{
  "user": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "João Silva",
    "role": "USER"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### **POST /auth/refresh**

Renova o access token usando o refresh token.

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### **POST /auth/logout**

Invalida o token atual (requer autenticação).

```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

### **👥 Users Endpoints**

#### **GET /users**

Lista todos os usuários (requer autenticação).

```http
GET /api/v1/users?page=1&limit=10&search=joão
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (opcional): Número da página (default: 1)
- `limit` (opcional): Itens por página (default: 10)
- `search` (opcional): Busca por nome ou email

**Response 200:**

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "email": "user@example.com",
      "name": "João Silva",
      "role": "USER",
      "is_active": true,
      "company": {
        "id": "cly9876543210",
        "name": "Empresa XYZ"
      },
      "createdAt": "2025-09-30T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

#### **GET /users/:id**

Busca um usuário por ID.

```http
GET /api/v1/users/clx1234567890
Authorization: Bearer <token>
```

#### **PATCH /users/:id**

Atualiza um usuário.

```http
PATCH /api/v1/users/clx1234567890
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "João Silva Santos",
  "role": "ADMIN"
}
```

#### **DELETE /users/:id**

Remove um usuário (soft delete).

```http
DELETE /api/v1/users/clx1234567890
Authorization: Bearer <token>
```

### **🏢 Company Endpoints**

#### **POST /companies**

Cria uma nova empresa.

```http
POST /api/v1/companies
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Empresa XYZ Ltda",
  "email": "contato@empresaxyz.com",
  "phone": "+55 11 98765-4321",
  "cnpj": "12.345.678/0001-90",
  "address": "Rua Exemplo, 123 - São Paulo, SP"
}
```

#### **GET /companies**

Lista todas as empresas.

```http
GET /api/v1/companies?page=1&limit=10
Authorization: Bearer <token>
```

#### **GET /companies/:id**

Busca uma empresa por ID.

```http
GET /api/v1/companies/cly9876543210
Authorization: Bearer <token>
```

#### **PATCH /companies/:id**

Atualiza uma empresa.

```http
PATCH /api/v1/companies/cly9876543210
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+55 11 91234-5678",
  "logoUrl": "https://example.com/logo.png"
}
```

### **💰 Cash Movement Endpoints**

#### **POST /cash-movements**

Registra uma nova movimentação financeira.

```http
POST /api/v1/cash-movements
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "ENTRY",
  "category": "SALE",
  "value": 1500.00,
  "description": "Venda de produto X",
  "date": "2025-09-30T14:30:00.000Z"
}
```

#### **GET /cash-movements**

Lista movimentações com filtros.

```http
GET /api/v1/cash-movements?type=ENTRY&startDate=2025-09-01&endDate=2025-09-30
Authorization: Bearer <token>
```

**Query Parameters:**
- `type`: ENTRY | EXIT
- `category`: SALE | PURCHASE | EXPENSE | INVESTMENT | TRANSFER | OTHER
- `startDate`: Data inicial (ISO 8601)
- `endDate`: Data final (ISO 8601)
- `page`: Número da página
- `limit`: Itens por página

#### **GET /cash-movements/summary**

Retorna resumo financeiro.

```http
GET /api/v1/cash-movements/summary?startDate=2025-09-01&endDate=2025-09-30
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "period": {
    "startDate": "2025-09-01T00:00:00.000Z",
    "endDate": "2025-09-30T23:59:59.999Z"
  },
  "summary": {
    "totalEntries": 15000.00,
    "totalExits": 8500.00,
    "balance": 6500.00,
    "entriesCount": 25,
    "exitsCount": 18
  },
  "byCategory": {
    "SALE": 12000.00,
    "EXPENSE": 5000.00,
    "INVESTMENT": 3500.00
  }
}
```

### **📦 Product Endpoints**

#### **POST /products**

Cria um novo produto.

```http
POST /api/v1/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Produto Exemplo",
  "description": "Descrição detalhada do produto",
  "price": 99.90,
  "stock": 100,
  "category_id": "cat123456"
}
```

#### **GET /products**

Lista produtos com filtros.

```http
GET /api/v1/products?category_id=cat123456&search=exemplo&page=1&limit=20
Authorization: Bearer <token>
```

#### **GET /products/:id**

Busca um produto por ID.

```http
GET /api/v1/products/prod123456
Authorization: Bearer <token>
```

#### **PATCH /products/:id**

Atualiza um produto.

```http
PATCH /api/v1/products/prod123456
Authorization: Bearer <token>
Content-Type: application/json

{
  "price": 89.90,
  "stock": 150
}
```

#### **DELETE /products/:id**

Remove um produto.

```http
DELETE /api/v1/products/prod123456
Authorization: Bearer <token>
```

### **🔮 GraphQL API**

A API GraphQL está disponível em `http://localhost:3000/graphql`.

#### **Queries**

```graphql
# Buscar usuário por ID
query GetUser($id: String!) {
  user(id: $id) {
    id
    email
    name
    role
    is_active
    company {
      id
      name
      cnpj
    }
    createdAt
  }
}

# Listar produtos
query ListProducts($filter: ProductFilterInput, $pagination: PaginationInput) {
  products(filter: $filter, pagination: $pagination) {
    data {
      id
      name
      description
      price
      stock
      category {
        id
        name
      }
    }
    meta {
      total
      page
      limit
      totalPages
    }
  }
}

# Resumo financeiro
query CashMovementSummary($startDate: DateTime!, $endDate: DateTime!) {
  cashMovementSummary(startDate: $startDate, endDate: $endDate) {
    totalEntries
    totalExits
    balance
    byCategory {
      category
      total
    }
  }
}
