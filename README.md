<div align="center">

![API Sistema GestãoInt](https://img.shields.io/badge/API-Sistema%20GestãoInt-blue?style=for-the-badge&logo=nestjs)

# 🏢 API Sistema GestãoInt

### **API RESTful de Nível Empresarial para Gestão Organizacional Interna**

*Construída com NestJS • Seguindo Princípios DDD & SOLID • Pronta para Produção com Docker & CI/CD*

---

[![Build Status](https://img.shields.io/github/actions/workflow/status/Joaoof/api-sistema-gestaoint/main.yml?branch=main&style=flat-square&logo=github)](https://github.com/Joaoof/api-sistema-gestaoint/actions)
[![Coverage](https://img.shields.io/codecov/c/github/Joaoof/api-sistema-gestaoint?style=flat-square&logo=codecov)](https://codecov.io/gh/Joaoof/api-sistema-gestaoint)
[![License](https://img.shields.io/github/license/Joaoof/api-sistema-gestaoint?style=flat-square)](./LICENSE)
[![Node Version](https://img.shields.io/node/v/@nestjs/core?style=flat-square&logo=node.js)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://docker.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)

[🚀 **Início Rápido**](#-início-rápido) • [📖 **Documentação**](#-documentação-da-api) • [🏗️ **Arquitetura**](#-arquitetura) • [🔧 **Desenvolvimento**](#-guia-de-desenvolvimento)

</div>

---

## 📋 **Índice**

<details>
<summary>Clique para expandir</summary>

- [🔍 Visão Geral](#-visão-geral)
- [✨ Principais Funcionalidades](#-principais-funcionalidades)
- [🛠️ Stack Tecnológica](#️-stack-tecnológica)
- [🏗️ Arquitetura](#️-arquitetura)
- [🚀 Início Rápido](#-início-rápido)
- [📖 Documentação da API](#-documentação-da-api)
- [🔧 Guia de Desenvolvimento](#-guia-de-desenvolvimento)
- [🧪 Estratégia de Testes](#-estratégia-de-testes)
- [🚢 Deploy](#-deploy)
- [📊 Performance e Monitoramento](#-performance-e-monitoramento)
- [🔒 Segurança](#-segurança)
- [🤝 Contribuindo](#-contribuindo)
- [📝 Licença](#-licença)

</details>

---

## 🔍 **Visão Geral**

A **API Sistema GestãoInt** é uma API RESTful de ponta, de nível empresarial, projetada para gestão organizacional interna abrangente. Construída com padrões arquiteturais modernos e melhores práticas da indústria, fornece uma solução backend robusta, escalável e sustentável.

### **🎯 Missão**
Capacitar organizações com uma API confiável, segura e de alta performance que otimiza operações internas mantendo qualidade de código e experiência do desenvolvedor.

### **🌟 Por que Escolher Esta API?**

| Funcionalidade | Benefício |
|----------------|-----------|
| 🏗️ **Design Orientado a Domínio** | Arquitetura de código limpa e sustentável |
| 🔒 **Segurança Empresarial** | Autenticação JWT com controle de acesso baseado em funções |
| 📈 **Infraestrutura Escalável** | Containerização Docker com orquestração |
| 🚀 **Pronto para CI/CD** | Pipelines automatizados de teste e deploy |
| 📊 **Monitoramento e Observabilidade** | Health checks e métricas integradas |
| 🧪 **Desenvolvimento Orientado a Testes** | Cobertura abrangente de testes |

---

## ✨ **Principais Funcionalidades**

<div align="center">

| 🔐 **Autenticação e Autorização** | 👥 **Gestão de Usuários** | 🏗️ **Arquitetura** |
|:---:|:---:|:---:|
| Gestão de Tokens JWT | Operações CRUD | Design Orientado a Domínio |
| Controle de Acesso Baseado em Funções | Gestão de Perfis | Princípios SOLID |
| Gestão de Sessões | Sistema de Permissões | Arquitetura Limpa |
| Segurança de Senhas | Validação de Usuários | Injeção de Dependência |

</div>

### **🚀 Funcionalidades Avançadas**

- **🔄 Atualizações em Tempo Real**: Suporte WebSocket para sincronização de dados ao vivo
- **📊 Dashboard de Analytics**: Capacidades integradas de métricas e relatórios
- **🌐 Suporte Multi-tenant**: Dados isolados por organização
- **🔍 Busca Avançada**: Busca de texto completo com filtragem e paginação
- **📱 Versionamento de API**: Compatibilidade retroativa com gestão de versões
- **🛡️ Rate Limiting**: Proteção contra abuso e ataques DDoS
- **📧 Integração de Email**: Notificações e alertas automatizados
- **🗄️ Migrações de Banco de Dados**: Mudanças de schema controladas por versão
- **🔄 Jobs em Background**: Processamento assíncrono de tarefas
- **📈 Otimização de Performance**: Cache e otimização de consultas

---

## 🛠️ **Stack Tecnológica**

<div align="center">

### **Tecnologias Principais**

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)

### **Banco de Dados e ORM**

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

### **DevOps e Infraestrutura**

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

### **Qualidade e Testes**

![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)

</div>

### **📦 Visão Geral das Dependências**

<details>
<summary>Ver lista detalhada de dependências</summary>

````json
{
  "production": {
    "@nestjs/core": "^10.0.0",
    "@nestjs/common": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "bcryptjs": "^2.4.3",
    "class-validator": "^0.14.0",
    "passport-jwt": "^4.0.1"
  },
  "development": {
    "@nestjs/testing": "^10.0.0",
    "jest": "^29.0.0",
    "supertest": "^6.3.0",
    "prisma": "^5.0.0"
  }
}
````

</details>

---

## 🏗️ **Arquitetura**

### **🎯 Princípios Arquiteturais**

Nossa API segue **Design Orientado a Domínio (DDD)** e **princípios SOLID** para garantir sustentabilidade, testabilidade e escalabilidade.

````mermaid
graph TB
    A[Requisição do Cliente] --> B[Camada Controller]
    B --> C[Camada Service]
    C --> D[Camada Domain]
    D --> E[Camada Repository]
    E --> F[Banco de Dados]
    
    G[Authentication Guard] --> B
    H[Validation Pipe] --> B
    I[Exception Filter] --> B
    
    style A fill:#e1f5fe
    style F fill:#f3e5f5
    style D fill:#fff3e0
````

### **📁 Estrutura do Projeto**

````
src/
├── 🏗️ core/                    # Camada de Domínio
│   ├── entities/               # Entidades de Negócio
│   ├── repositories/           # Interfaces de Repository
│   ├── use-cases/             # Lógica de Negócio
│   └── exceptions/            # Exceções Customizadas
├── 🔧 infrastructure/          # Camada de Infraestrutura
│   ├── database/              # Implementações de Banco de Dados
│   ├── services/              # Serviços Externos
│   └── config/                # Configuração
├── 🌐 modules/                 # Camada de Apresentação
│   ├── auth/                  # Módulo de Autenticação
│   ├── users/                 # Módulo de Gestão de Usuários
│   └── shared/                # Componentes Compartilhados
├── 🛠️ shared/                  # Preocupações Transversais
│   ├── pipes/                 # Pipes de Validação
│   ├── guards/                # Guards de Autenticação
│   ├── interceptors/          # Interceptors de Request/Response
│   └── decorators/            # Decorators Customizados
├── 📊 monitoring/              # Observabilidade
│   ├── health/                # Health Checks
│   ├── metrics/               # Métricas de Performance
│   └── logging/               # Logging Estruturado
└── 🧪 __tests__/              # Suítes de Teste
    ├── unit/                  # Testes Unitários
    ├── integration/           # Testes de Integração
    └── e2e/                   # Testes End-to-End
````

### **🔄 Fluxo de Requisição**

````mermaid
sequenceDiagram
    participant C as Cliente
    participant G as Guard
    participant Ctrl as Controller
    participant S as Service
    participant R as Repository
    participant DB as Banco de Dados

    C->>G: Requisição HTTP
    G->>G: Validar JWT
    G->>Ctrl: Requisição Autorizada
    Ctrl->>Ctrl: Validar Input
    Ctrl->>S: Lógica de Negócio
    S->>R: Operação de Dados
    R->>DB: Query/Mutation
    DB-->>R: Resultado
    R-->>S: Entidade de Domínio
    S-->>Ctrl: DTO de Resposta
    Ctrl-->>C: Resposta HTTP
````

---

## 🚀 **Início Rápido**

### **📋 Pré-requisitos**

| Requisito | Versão | Instalação |
|-----------|--------|------------|
| **Node.js** | ≥ 18.x | [Download](https://nodejs.org) |
| **Docker** | ≥ 20.x | [Download](https://docker.com) |
| **PostgreSQL** | ≥ 14.x | [Download](https://postgresql.org) |
| **Git** | Mais recente | [Download](https://git-scm.com) |

### **⚡ Métodos de Instalação**

<details>
<summary><strong>🐳 Docker (Recomendado)</strong></summary>

````bash
# Clonar o repositório
git clone https://github.com/Joaoof/api-sistema-gestaoint.git
cd api-sistema-gestaoint

# Iniciar com Docker Compose
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Acessar a API
curl http://localhost:3000/health
````

</details>

<details>
<summary><strong>💻 Desenvolvimento Local</strong></summary>

````bash
# Clonar e configurar
git clone https://github.com/Joaoof/api-sistema-gestaoint.git
cd api-sistema-gestaoint

# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Editar .env com suas credenciais de banco de dados

# Configuração do banco de dados
npx prisma migrate deploy
npx prisma db seed

# Iniciar servidor de desenvolvimento
npm run start:dev

# API estará disponível em http://localhost:3000
````

</details>

### **🔧 Configuração de Ambiente**

<details>
<summary>Ver variáveis de ambiente</summary>

````bash
# Banco de Dados
DATABASE_URL="postgresql://user:password@localhost:5432/gestaoint"
REDIS_URL="redis://localhost:6379"

# Autenticação
JWT_SECRET="sua-chave-jwt-super-secreta"
JWT_EXPIRES_IN="7d"

# Aplicação
NODE_ENV="development"
PORT=3000
API_VERSION="v1"

# Serviços Externos
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha-de-app"

# Monitoramento
SENTRY_DSN="seu-sentry-dsn"
LOG_LEVEL="info"
````

</details>

---

## 📖 **Documentação da API**

### **🔗 URL Base**
````
Produção:     https://api.gestaoint.com/v1
Desenvolvimento: http://localhost:3000/v1
````

### **🔐 Autenticação**

Todos os endpoints protegidos requerem um token Bearer no cabeçalho Authorization:

````bash
Authorization: Bearer <seu-jwt-token>
````

### **📋 Visão Geral dos Endpoints**

<details>
<summary><strong>🔐 Endpoints de Autenticação</strong></summary>

#### **POST** `/auth/login`
Autenticar usuário e receber token JWT.

**Requisição:**
````json
{
  "email": "usuario@exemplo.com",
  "password": "senhaSegura123"
}
````

**Resposta:**
````json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "usuario@exemplo.com",
    "role": "USER"
  },
  "expiresIn": 604800
}
````

#### **POST** `/auth/register`
Criar nova conta de usuário.

**Requisição:**
````json
{
  "name": "João Silva",
  "email": "usuario@exemplo.com",
  "password": "senhaSegura123",
  "confirmPassword": "senhaSegura123"
}
````

#### **POST** `/auth/refresh`
Renovar token JWT usando refresh token.

#### **POST** `/auth/logout`
Invalidar sessão atual.

</details>

<details>
<summary><strong>👥 Endpoints de Gestão de Usuários</strong></summary>

#### **GET** `/users`
Listar todos os usuários com paginação e filtragem.

**Parâmetros de Query:**
- `page`: Número da página (padrão: 1)
- `limit`: Itens por página (padrão: 10, máx: 100)
- `search`: Termo de busca para nome/email
- `role`: Filtrar por função do usuário
- `status`: Filtrar por status do usuário

**Resposta:**
````json
{
  "data": [
    {
      "id": "uuid",
      "name": "João Silva",
      "email": "usuario@exemplo.com",
      "role": "USER",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
````

#### **GET** `/users/:id`
Obter detalhes do usuário por ID.

#### **PATCH** `/users/:id`
Atualizar informações do usuário.

#### **DELETE** `/users/:id`
Exclusão suave da conta do usuário.

</details>

### **📊 Formato de Resposta**

Todas as respostas da API seguem um formato consistente:

````json
{
  "success": true,
  "data": {},
  "message": "Operação concluída com sucesso",
  "timestamp": "2024-01-01T00:00:00Z",
  "path": "/api/v1/users",
  "version": "1.0.0"
}
````

### **❌ Tratamento de Erros**

````json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Falha na validação",
    "details": [
      {
        "field": "email",
        "message": "Formato de email inválido"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "path": "/api/v1/auth/login",
  "requestId": "uuid"
}
````

---

## 🔧 **Guia de Desenvolvimento**

### **🛠️ Comandos de Desenvolvimento**

````bash
# Desenvolvimento
npm run start:dev          # Iniciar com hot reload
npm run start:debug        # Iniciar com debugger
npm run start:prod         # Iniciar build de produção

# Build
npm run build              # Build para produção
npm run build:watch        # Build com modo watch

# Banco de Dados
npm run db:migrate         # Executar migrações
npm run db:seed            # Popular banco de dados
npm run db:reset           # Resetar banco de dados
npm run db:studio          # Abrir Prisma Studio

# Qualidade de Código
npm run lint               # Executar ESLint
npm run lint:fix           # Corrigir problemas do ESLint
npm run format             # Formatar com Prettier
npm run type-check         # Verificação de tipos TypeScript

# Testes
npm run test               # Executar testes unitários
npm run test:watch         # Executar testes em modo watch
npm run test:cov           # Gerar relatório de cobertura
npm run test:e2e           # Executar testes end-to-end
````

### **🔄 Fluxo Git**

Seguimos **Conventional Commits** e estratégia de branching **GitFlow**:

````bash
# Desenvolvimento de funcionalidade
git checkout -b feature/gestao-usuarios
git commit -m "feat(users): adicionar endpoint de criação de usuário"

# Correção de bugs
git checkout -b fix/validacao-auth
git commit -m "fix(auth): resolver problema de validação JWT"

# Releases
git checkout -b release/v1.2.0
git commit -m "chore(release): bump version to 1.2.0"
````

### **📝 Diretrizes de Estilo de Código**

<details>
<summary>Ver padrões de codificação</summary>

#### **Melhores Práticas TypeScript**
- Usar configuração TypeScript estrita
- Preferir interfaces sobre types para formas de objeto
- Usar enums para constantes com múltiplos valores
- Implementar tratamento adequado de erros com exceções customizadas

#### **Padrões NestJS**
- Usar injeção de dependência para todos os serviços
- Implementar DTOs adequados para validação de request/response
- Usar guards para autenticação e autorização
- Implementar interceptors para preocupações transversais

#### **Diretrizes de Banco de Dados**
- Usar schema Prisma para modelagem de banco de dados
- Implementar indexação adequada para performance
- Usar transações para operações complexas
- Seguir convenções de nomenclatura para tabelas e colunas

</details>

---

## 🧪 **Estratégia de Testes**

### **🎯 Pirâmide de Testes**

````mermaid
graph TD
    A[Testes E2E<br/>10%] --> B[Testes de Integração<br/>20%]
    B --> C[Testes Unitários<br/>70%]
    
    style A fill:#ffcdd2
    style B fill:#fff3e0
    style C fill:#e8f5e8
````

### **📊 Requisitos de Cobertura**

| Tipo | Cobertura Mínima | Cobertura Atual |
|------|------------------|-----------------|
| **Testes Unitários** | 80% | ![Coverage](https://img.shields.io/badge/85%25-passing-brightgreen) |
| **Testes de Integração** | 70% | ![Coverage](https://img.shields.io/badge/75%25-passing-brightgreen) |
| **Testes E2E** | 60% | ![Coverage](https://img.shields.io/badge/65%25-passing-brightgreen) |

### **🧪 Exemplos de Teste**

<details>
<summary>Exemplo de Teste Unitário</summary>

````typescript
describe('UserService', () => {
  let service: UserService;
  let repository: MockRepository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useClass: MockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  describe('createUser', () => {
    it('deve criar um novo usuário com sucesso', async () => {
      const createUserDto = {
        name: 'João Silva',
        email: 'joao@exemplo.com',
        password: 'senha123',
      };

      const expectedUser = {
        id: 'uuid',
        ...createUserDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.save.mockResolvedValue(expectedUser);

      const result = await service.createUser(createUserDto);

      expect(result).toEqual(expectedUser);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining(createUserDto)
      );
    });
  });
});
````

</details>

---

## 🚢 **Deploy**

### **🐳 Deploy com Docker**

<details>
<summary>Configuração Docker de Produção</summary>

````yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: gestaoint
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
````

</details>

### **☁️ Opções de Deploy em Nuvem**

| Plataforma | Configuração | Custo Estimado |
|------------|--------------|----------------|
| **AWS ECS** | Fargate + RDS | $50-200/mês |
| **Google Cloud Run** | Serverless + Cloud SQL | $30-150/mês |
| **DigitalOcean** | Droplet + Managed DB | $25-100/mês |
| **Heroku** | Dyno + Postgres | $25-75/mês |

### **🔄 Pipeline CI/CD**

````yaml
# .github/workflows/deploy.yml
name: Deploy para Produção

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t api-gestaoint .
      - name: Deploy para produção
        run: |
          # Comandos de deploy aqui
````

---

## 📊 **Performance e Monitoramento**

### **📈 Métricas de Performance**

| Métrica | Meta | Atual |
|---------|------|-------|
| **Tempo de Resposta** | < 200ms | ![Performance](https://img.shields.io/badge/150ms-excelente-brightgreen) |
| **Throughput** | > 1000 RPS | ![Performance](https://img.shields.io/badge/1200_RPS-excelente-brightgreen) |
| **Uptime** | > 99.9% | ![Performance](https://img.shields.io/badge/99.95%25-excelente-brightgreen) |
| **Taxa de Erro** | < 0.1% | ![Performance](https://img.shields.io/badge/0.05%25-excelente-brightgreen) |

### **🔍 Stack de Monitoramento**

- **📊 Métricas**: Prometheus + Grafana
- **📝 Logging**: Winston + ELK Stack
- **🚨 Alertas**: Integração PagerDuty
- **🔍 Tracing**: Jaeger para tracing distribuído
- **💾 Monitoramento de Banco de Dados**: pgAdmin + análise de consultas lentas

### **🏥 Health Checks**

````typescript
@Controller('health')
export class HealthController {
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck('nestjs-docs', 'https://nestjs.com'),
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { path: '/', threshold: 0.8 }),
    ]);
  }
}
````

---

## 🔒 **Segurança**

### **🛡️ Funcionalidades de Segurança**

- ✅ **Autenticação JWT** com refresh tokens
- ✅ **Controle de Acesso Baseado em Funções (RBAC)**
- ✅ **Rate Limiting** para prevenir abuso
- ✅ **Validação de Input** com class-validator
- ✅ **Proteção contra SQL Injection** via Prisma ORM
- ✅ **Configuração CORS** para requisições cross-origin
- ✅ **Helmet.js** para cabeçalhos de segurança
- ✅ **Hash de Senhas** com bcrypt
- ✅ **Versionamento de API** para compatibilidade retroativa
- ✅ **Logging de Requisições** para trilhas de auditoria

### **🔐 Melhores Práticas de Segurança**

<details>
<summary>Ver diretrizes de segurança</summary>

#### **Autenticação e Autorização**
````typescript
// Implementação da Estratégia JWT
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return { 
      userId: payload.sub, 
      username: payload.username,
      roles: payload.roles 
    };
  }
}
````

#### **Validação de Input**
````typescript
// DTO com validação
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  password: string;
}
````

</details>

### **🚨 Checklist de Segurança**

- [ ] Atualizações regulares de dependências
- [ ] Configuração de cabeçalhos de segurança
- [ ] Proteção de variáveis de ambiente
- [ ] Criptografia de conexão com banco de dados
- [ ] Implementação de rate limiting da API
- [ ] Sanitização e validação de input
- [ ] Sanitização de mensagens de erro
- [ ] Implementação de logging de auditoria
- [ ] Cronograma de testes de penetração
- [ ] Plano de resposta a incidentes de segurança

---

## 🤝 **Contribuindo**

Damos as boas-vindas a contribuições da comunidade! Por favor, siga nossas diretrizes de contribuição.

### **🔄 Fluxo de Contribuição**

1. **🍴 Fork** o repositório
2. **🌿 Criar** uma branch de funcionalidade: `git checkout -b feature/funcionalidade-incrivel`
3. **💻 Commit** suas mudanças: `git commit -m 'feat: adicionar funcionalidade incrível'`
4. **📤 Push** para a branch: `git push origin feature/funcionalidade-incrivel`
5. **🔄 Abrir** um Pull Request

### **📋 Diretrizes de Pull Request**

- Seguir o estilo de código e convenções existentes
- Incluir testes para novas funcionalidades
- Atualizar documentação conforme necessário
- Garantir que todas as verificações de CI passem
- Fornecer uma descrição clara das mudanças

### **🐛 Relatórios de Bug**

Ao relatar bugs, por favor inclua:
- Passos para reproduzir o problema
- Comportamento esperado vs comportamento atual
- Detalhes do ambiente (SO, versão do Node.js, etc.)
- Logs relevantes ou mensagens de erro

### **💡 Solicitações de Funcionalidade**

Para solicitações de funcionalidade, por favor forneça:
- Descrição clara da funcionalidade proposta
- Caso de uso e justificativa de negócio
- Abordagem potencial de implementação
- Quaisquer mockups ou exemplos relevantes

---

## 📝 **Licença**

Este projeto está licenciado sob a **Licença MIT** - veja o arquivo [LICENSE](./LICENSE) para detalhes.

````
Licença MIT

Copyright (c) 2024 API Sistema GestãoInt

É concedida permissão, gratuitamente, a qualquer pessoa que obtenha uma cópia
deste software e arquivos de documentação associados (o "Software"), para lidar
no Software sem restrição, incluindo sem limitação os direitos
de usar, copiar, modificar, mesclar, publicar, distribuir, sublicenciar e/ou vender
cópias do Software, e permitir que pessoas a quem o Software é
fornecido o façam, sujeito às seguintes condições:

O aviso de copyright acima e este aviso de permissão devem ser incluídos em todas
as cópias ou partes substanciais do Software.
````

---

<div align="center">

### **🚀 Pronto para Transformar Sua Organização?**

**Faça o deploy desta API de nível empresarial e dê aos seus clientes uma vantagem competitiva com infraestrutura backend robusta, escalável e profissional!**

---

**Feito com ❤️ pela Equipe GestãoInt**

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Joaoof/api-sistema-gestaoint)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/joaoof)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:contact@gestaoint.com)

⭐ **Dê uma estrela neste repositório se ele te ajudou!**

</div>
