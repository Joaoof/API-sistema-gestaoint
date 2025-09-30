# 🏢 API Sistema GestãoInt

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-97.5%25-blue?style=for-the-badge&logo=typescript)
![NestJS](https://img.shields.io/badge/NestJS-Framework-red?style=for-the-badge&logo=nestjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue?style=for-the-badge&logo=postgresql)
![GraphQL](https://img.shields.io/badge/GraphQL-API-pink?style=for-the-badge&logo=graphql)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker)

### **API RESTful de Nível Empresarial para Gestão Organizacional Interna**

*Construída com **NestJS** • **Clean Architecture** • **Domain-Driven Design** • **TypeScript***

[🚀 Documentação](#-documentação) • [📖 Guia de Instalação](#-instalação) • [🏗️ Arquitetura](#-arquitetura) • [🔧 Desenvolvimento](#-desenvolvimento)

</div>

---

## 🔍 **Visão Geral**

A **API Sistema GestãoInt** é uma solução backend de **nível empresarial** construída com **NestJS** e **TypeScript**, seguindo os princípios de **Clean Architecture** e **Domain-Driven Design (DDD)**. 

Projetada para **gestão organizacional interna abrangente**, oferece uma infraestrutura **robusta, escalável e sustentável** para organizações que buscam **excelência operacional**.

### 🎯 **Características Principais**

- 🏗️ **Clean Architecture** - Código sustentável e testável
- 🔒 **Security-First** - JWT + Argon2 + Rate Limiting  
- 📈 **Alta Performance** - < 200ms response time
- 🧪 **Quality Assurance** - +80% test coverage
- 🚀 **Production Ready** - Docker + CI/CD
- 📊 **GraphQL + REST** - APIs modernas e flexíveis

---

## 🛠️ **Stack Tecnológica**

### **Core Technologies**
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Node.js** | ≥18.x | Runtime JavaScript |
| **NestJS** | ^11.0.1 | Framework backend |
| **TypeScript** | ^5.7.3 | Type safety |
| **Fastify** | ^4.29.1 | HTTP server |

### **Database & ORM**
| Tecnologia | Versão | Função |
|------------|--------|--------|
| **PostgreSQL** | ≥14.x | Banco principal |
| **Prisma** | ^6.13.0 | ORM |
| **Redis** | ^5.5.6 | Cache |

### **APIs & Security**
| Componente | Tecnologia | Status |
|------------|------------|--------|
| **REST API** | Swagger/OpenAPI | ✅ Implementado |
| **GraphQL** | Apollo Server | ✅ Implementado |
| **Authentication** | JWT + Passport | ✅ Implementado |
| **Hashing** | Argon2 | ✅ Implementado |
| **Rate Limiting** | @nestjs/throttler | ✅ Implementado |

---

## 🏗️ **Arquitetura**

### **📐 Clean Architecture + DDD**

```
src/
├── 🏗️ core/                    # DOMAIN LAYER
│   ├── entities/               # Entidades de Negócio
│   ├── use-cases/              # Regras de Negócio  
│   ├── ports/                  # Interfaces/Contratos
│   ├── dtos/                   # Data Transfer Objects
│   └── exceptions/             # Exceções de Domínio
│
├── 🔧 infra/                   # INFRASTRUCTURE LAYER
│   ├── database/               # Implementações BD
│   ├── services/               # Serviços Externos
│   ├── cache/                  # Redis Cache
│   ├── graphql/                # GraphQL Schema
│   └── filters/                # Exception Filters
│
├── 🌐 modules/                 # PRESENTATION LAYER
│   ├── auth/                   # Autenticação
│   ├── user/                   # Gestão Usuários
│   ├── company/                # Gestão Empresas
│   └── cashMovement/           # Movimentações
│
├── 🛠️ shared/                  # CROSS-CUTTING
│   ├── guards/                 # Security Guards
│   ├── dto/                    # DTOs Compartilhados
│   ├── utils/                  # Utilitários
│   └── swagger/                # API Documentation
│
└── 🧪 tests__/                 # TEST SUITES
    ├── unit/                   # Testes Unitários
    ├── integration/            # Testes Integração
    ├── e2e/                    # End-to-End
    └── architecture/           # Testes Arquiteturais
```

### **🎯 Princípios SOLID**
- ✅ **Single Responsibility** - Uma responsabilidade por classe
- ✅ **Open/Closed** - Aberto para extensão, fechado para modificação  
- ✅ **Liskov Substitution** - Subtipos substituíveis
- ✅ **Interface Segregation** - Interfaces específicas
- ✅ **Dependency Inversion** - Dependência de abstrações

---

## 📊 **Modelo de Dados**

### **🏢 Principais Entidades**

#### **Users**
```prisma
model Users {
  id: String @id @default(cuid())
  email: String @unique
  password_hash: String
  name: String
  company_id: String
  role: String  
  is_active: Boolean
  createdAt: DateTime @default(now())
  
  // Relacionamentos
  company: Company?
  CashMovement: CashMovement[]
  Product: Product[]
  Category: Category[]
}
```

#### **Company**
```prisma
model Company {
  id: String @id @default(cuid())
  name: String @unique
  email: String? @unique
  phone: String?
  address: String?
  cnpj: String? @unique
  logoUrl: String?
  is_active: Boolean? @default(true)
  
  // Relacionamentos
  Users: Users[]
  companyPlan: CompanyPlan?
}
```

#### **CashMovement**
```prisma
model CashMovement {
  id: String @id @default(uuid())
  type: MovementType        // ENTRY | EXIT
  category: MovementCategory // SALE, EXPENSE, etc.
  value: Decimal
  description: String
  date: DateTime @default(now())
  user_id: String
  
  // Relacionamentos
  user: Users
  
  // Índices para performance
  @@index([user_id, date(sort: Desc)])
}
```

### **📈 Materialized Views**
- **`auth_login_view`** - Dados agregados para login
- **`mv_cash_movements_per_user`** - Movimentações por usuário

---

## 🌐 **APIs & Endpoints**

### **🔹 GraphQL API**

#### **Queries**
```graphql
type Query {
  # Dados do usuário autenticado
  me: UserResponseDto!
  
  # Buscar empresa por ID
  company(id: String!): CompanyDto!
  
  # Movimentações financeiras
  cashMovements(input: FindAllCashMovementInput): [CashMovementGraphQL!]!
  
  # Estatísticas do dashboard
  dashboardStats(input: DashboardStatsInput): DashboardStats!
}
```

#### **Mutations**
```graphql
type Mutation {
  # Autenticação de usuário
  login(loginUserInput: LoginUserInput!): AuthPayload!
  
  # Criar movimentação financeira
  createCashMovement(input: CreateCashMovementInput!): CashMovementGraphQL!
}
```

#### **Principais Types**
```graphql
type AuthPayload {
  accessToken: String!
  expiresIn: String!
  user: UserDto!
  company: CompanyDto!
  plan: PlanDto
}

type UserDto {
  id: String!
  name: String!
  email: String!
  role: String!
  company_id: String!
  permissions: [PermissionDto]!
  company: CompanyDto!
}
```

### **🔹 REST API**

| Method | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/health` | Health check |
| `GET` | `/api-docs` | Swagger documentation |

---

## 🔒 **Segurança**

### **🛡️ Camadas de Proteção**

| Proteção | Tecnologia | Status |
|----------|------------|--------|
| **Password Hashing** | Argon2 | ✅ |
| **JWT Authentication** | @nestjs/jwt | ✅ |
| **Rate Limiting** | @nestjs/throttler | ✅ |
| **CORS Protection** | Fastify CORS | ✅ |
| **Security Headers** | Helmet | ✅ |
| **Input Validation** | class-validator | ✅ |
| **SQL Injection Protection** | Prisma ORM | ✅ |

### **🔑 Configuração JWT**
```typescript
// JWT Strategy
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }
}
```

### **⚡ Rate Limiting**
```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,    // 60 segundos
  limit: 100     // 100 requests por minuto
}])
```

---

## 🧪 **Testes**

### **📊 Estratégia de Testes**

| Tipo | Cobertura Meta | Ferramenta |
|------|---------------|------------|
| **Unit Tests** | >80% | Jest |
| **Integration Tests** | >70% | Jest + TestModule |
| **E2E Tests** | >60% | Jest + Supertest |
| **Architecture Tests** | 100% | Custom Rules |

### **🔧 Configuração Jest**
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['/src', '/tests__'],
  moduleNameMapper: {
    '^src/(.*)$': '/src/$1',
    '^@modules/(.*)$': '/src/modules/$1',
    '^@core/(.*)$': '/src/core/$1'
  }
}
```

### **📋 Scripts de Teste**
```bash
npm run test          # Testes unitários
npm run test:watch    # Watch mode  
npm run test:cov      # Cobertura
npm run test:e2e      # End-to-end
```

---

## 🚀 **Instalação**

### **📋 Pré-requisitos**
- **Node.js** ≥ 18.x
- **PostgreSQL** ≥ 14.x  
- **Docker** ≥ 20.x (opcional)
- **Git** (latest)

### **⚡ Setup Rápido**

#### **1. Clone & Install**
```bash
# Clone do repositório
git clone https://github.com/Joaoof/api-sistema-gestaoint.git
cd api-sistema-gestaoint

# Instalar dependências
npm install
```

#### **2. Environment Setup**
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Configurar variáveis (editar .env)
BANCO_URL="postgresql://user:pass@localhost:5432/gestao_db"
JWT_SECRET="your-super-secure-jwt-secret"
REDIS_URL="redis://localhost:6379"
```

#### **3. Database Setup**
```bash
# Executar migrações
npx prisma migrate deploy

# Seed inicial (opcional)
npx prisma db seed

# Verificar com Prisma Studio
npx prisma studio
```

#### **4. Start Development**
```bash
# Desenvolvimento com hot reload
npm run start:dev

# URLs disponíveis:
# http://localhost:3000/graphql - GraphQL Playground
# http://localhost:3000/api-docs - Swagger UI  
# http://localhost:3000/health - Health Check
```

### **🐳 Docker Setup (Recomendado)**
```bash
# Build e start com Docker Compose
docker-compose up -d

# Executar migrações no container
docker-compose exec api npx prisma migrate deploy
```

---

## 🔧 **Desenvolvimento**

### **📋 Scripts Disponíveis**

| Comando | Descrição |
|---------|-----------|
| `npm run start:dev` | Desenvolvimento com hot reload |
| `npm run start:debug` | Debug mode |
| `npm run build` | Build para produção |
| `npm run start:prod` | Executar build de produção |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier formatting |
| `npm run type-check` | TypeScript validation |

### **🔄 Git Workflow**

#### **Conventional Commits**
```bash
# Feature
git commit -m "feat(users): adicionar endpoint de criação"

# Bugfix
git commit -m "fix(auth): resolver validação JWT"

# Chore  
git commit -m "chore(deps): atualizar dependências"
```

#### **Branch Strategy**
```bash
# Nova feature
git checkout -b feature/nova-funcionalidade
git commit -m "feat: implementar nova funcionalidade"
git push origin feature/nova-funcionalidade

# Hotfix
git checkout -b hotfix/correcao-critica  
git commit -m "fix: corrigir bug crítico"
```

### **📚 URLs Úteis**
- **GraphQL Playground**: http://localhost:3000/graphql
- **Swagger Documentation**: http://localhost:3000/api-docs  
- **Prisma Studio**: `npx prisma studio`
- **Health Check**: http://localhost:3000/health

---

## 📈 **Performance**

### **⚡ Métricas Target**

| Métrica | Meta | Status |
|---------|------|--------|
| **Response Time** | < 200ms | 🎯 Otimizado |
| **Throughput** | > 1000 RPS | 📊 Escalável |
| **Uptime** | > 99.9% | 🟢 Estável |
| **Error Rate** | < 0.1% | 📉 Baixo |

### **🔧 Otimizações**

#### **Caching**
```typescript
CacheModule.register({
  ttl: 60,        // 60 segundos
  max: 100,       // 100 itens
  isGlobal: true  // Cache global
})
```

#### **Database**
- **Índices estratégicos** em queries frequentes
- **Materialized Views** para dados agregados  
- **Connection pooling** otimizado
- **Query optimization** via Prisma

#### **Monitoring**
```typescript
// Refresh automático de views materializadas
cron.schedule('*/5 * * * *', async () => {
  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW auth_login_view;`;
  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW mv_cash_movements_per_user;`;
});
```

---

## 🚢 **Deploy**

### **🐳 Docker Deployment**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS production  
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### **☁️ Opções de Deploy**

| Plataforma | Configuração | Custo/mês |
|------------|--------------|-----------|
| **Railway** | One-click deploy | $20-80 |
| **DigitalOcean** | Droplet + DB | $25-100 |
| **AWS ECS** | Fargate + RDS | $50-200 |
| **Google Cloud** | Cloud Run + SQL | $30-150 |

### **🔄 CI/CD Pipeline**
```yaml
name: Deploy Production
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          # Deploy commands here
```

---

## 📊 **Métricas do Projeto**

<div align="center">

| **Métrica** | **Valor** |
|-------------|-----------|
| **Total Commits** | 228+ |
| **Contribuidores** | 2 |
| **Linguagem Principal** | TypeScript (97.5%) |
| **Linhas de Código** | 10,000+ |
| **Arquivos** | 150+ |
| **Última Atualização** | Ativa |

</div>

---

## 🤝 **Contribuição**

### **Como Contribuir**
1. **Fork** o repositório
2. **Branch** nova feature: `git checkout -b feature/amazing-feature`
3. **Commit** mudanças: `git commit -m 'feat: add amazing feature'`  
4. **Push** para branch: `git push origin feature/amazing-feature`
5. **Pull Request** bem documentado

### **📋 Checklist PR**
- [ ] Código segue padrões do projeto
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] CI checks passando
- [ ] Descrição clara das mudanças

---

## 📄 **Licença**

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<div align="center">

### **🚀 Pronto para transformar sua organização!**

*Uma API de nível empresarial que combina **performance**, **segurança** e **escalabilidade***

**⭐ Se este projeto foi útil, considere dar uma estrela!**

---

*Feito com ❤️ e muito ☕ pela equipe de desenvolvimento*

</div>
