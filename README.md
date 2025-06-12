<p align="center">
  <a href="https://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="100" alt="NestJS Logo"/>
  </a>
</p>

<h1 align="center">🧱 NestJS + Docker + GitHub Actions · Arquitetura DDD + SOLID</h1>

<p align="center">
  Projeto modular com <strong>NestJS</strong>, estruturado segundo os princípios do <strong>DDD</strong> e <strong>SOLID</strong>, pronto para produção com <strong>Docker</strong> e <strong>GitHub Actions</strong>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@nestjs/core" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="Versão no NPM" /></a>
  <a href="https://www.npmjs.com/package/@nestjs/core" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Licença MIT" /></a>
  <a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="Build CircleCI" /></a>
  <a href="https://discord.gg/nestjs" target="_blank"><img src="https://img.shields.io/discord/520858362747142154.svg?label=Discord&logo=discord" alt="Discord NestJS" /></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social" alt="Siga no Twitter" /></a>
</p>

---

## 📦 Tecnologias

- **NestJS**
- **TypeScript**
- **Docker & Docker Compose**
- **Prisma ORM**
- **GitHub Actions (CI/CD)**
- **Arquitetura DDD + SOLID**

---

## 📁 Estrutura de Diretórios (Domain-Driven Design)

```plaintext
src/
├── core/                        # Camada de domínio (Domain Layer)
│   ├── entities/                # Entidades de negócio
│   ├── repositories/            # Interfaces dos repositórios
│   ├── use-cases/               # Casos de uso (Application Layer)
│   └── exceptions/              # Exceções de domínio
│
├── infrastructure/             # Camada de infraestrutura
│   ├── database/
│   │   ├── prisma/              # ORMs, migrations
│   │   └── implementations/     # Repositórios concretos
│   └── services/                # Provedores externos (e.g., e-mail, fila)
│
├── modules/                    # Camada de interface (Delivery Layer)
│   └── user/                   # Exemplo de módulo
│       ├── controllers/         # Controllers (HTTP)
│       ├── dtos/                # Data Transfer Objects
│       ├── mappers/             # Conversores de entidade <-> dto
│       └── user.module.ts       # Declaração do módulo NestJS
│
├── shared/                     # Pipes, filters, interceptors, helpers
├── main.ts                     # Entry point da aplicação
└── app.module.ts               # Módulo raiz da aplicação
```

🚀 Primeiros Passos
bash
Copiar
Editar

# Instalar dependências

npm install

# Rodar o projeto em desenvolvimento

npm run start:dev
