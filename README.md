<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Documentação NestJS</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #0f172a;
      color: #e2e8f0;
      margin: 0;
      padding: 2rem;
    }
    a {
      color: #38bdf8;
      text-decoration: none;
    }
    h1, h2, h3 {
      color: #f8fafc;
    }
    .logo {
      text-align: center;
      margin-bottom: 2rem;
    }
    .logo img {
      width: 100px;
    }
    .centered {
      text-align: center;
    }
    .badges img {
      margin: 0.3rem;
    }
    .section {
      margin-bottom: 2.5rem;
    }
    .code-block {
      background-color: #1e293b;
      border-radius: 0.5rem;
      padding: 1rem;
      font-family: monospace;
      overflow-x: auto;
    }
    ul {
      padding-left: 1.5rem;
    }
    li {
      margin-bottom: 0.5rem;
    }
    hr {
      border-color: #334155;
      margin: 3rem 0;
    }
  </style>
</head>
<body>
  <div class="logo">
    <a href="https://nestjs.com/" target="_blank">
      <img src="https://nestjs.com/img/logo-small.svg" alt="NestJS Logo">
    </a>
  </div>

  <h1 class="centered">🧱 NestJS + Docker + GitHub Actions</h1>
  <h3 class="centered">Arquitetura DDD + SOLID · Pronto para Produção</h3>

  <p class="centered">
    Projeto modular utilizando <strong>NestJS</strong>, estruturado com <strong>DDD</strong> e <strong>SOLID</strong>, pronto para produção com <strong>Docker</strong> e <strong>GitHub Actions</strong>.
  </p>

  <div class="badges centered">
    <a href="https://www.npmjs.com/package/@nestjs/core"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="Versão no NPM"></a>
    <a href="https://www.npmjs.com/package/@nestjs/core"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Licença MIT"></a>
    <a href="https://circleci.com/gh/nestjs/nest"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="Build"></a>
    <a href="https://discord.gg/nestjs"><img src="https://img.shields.io/discord/520858362747142154.svg?label=Discord&logo=discord" alt="Discord"></a>
    <a href="https://twitter.com/nestframework"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social" alt="Twitter"></a>
  </div>

  <hr />

  <div class="section">
    <h2>📦 Tecnologias Utilizadas</h2>
    <ul>
      <li><strong>NestJS</strong> — Framework escalável para Node.js</li>
      <li><strong>TypeScript</strong> — Tipagem estática moderna</li>
      <li><strong>Docker & Docker Compose</strong> — Contêineres</li>
      <li><strong>Prisma ORM</strong> — Abstração de banco de dados</li>
      <li><strong>GitHub Actions</strong> — CI/CD automatizado</li>
      <li><strong>DDD + SOLID</strong> — Arquitetura robusta e sustentável</li>
    </ul>
  </div>

  <div class="section">
    <h2>📁 Estrutura de Diretórios (DDD)</h2>
    <div class="code-block">
<pre>src/
├── core/                  # Camada de domínio
│   ├── entities/          # Entidades de negócio
│   ├── repositories/      # Interfaces dos repositórios
│   ├── use-cases/         # Casos de uso
│   └── exceptions/        # Exceções de domínio
│
├── infrastructure/       # Infraestrutura
│   ├── database/
│   │   ├── prisma/        # Migrations, schema
│   │   └── implementations/ # Repositórios concretos
│   └── services/          # Serviços externos (e-mail, fila etc)
│
├── modules/              # Interface com o mundo externo
│   └── user/
│       ├── controllers/   # Controllers HTTP
│       ├── dtos/          # Data Transfer Objects
│       ├── mappers/       # Conversores
│       └── user.module.ts # Módulo NestJS
│
├── shared/               # Pipes, Interceptors, Helpers
├── main.ts               # Entry point
└── app.module.ts         # Módulo raiz</pre>
    </div>
  </div>

  <div class="section">
    <h2>🚀 Primeiros Passos</h2>
    <div class="code-block">
<pre># Instalar dependências
npm install

# Rodar em modo desenvolvimento

npm run start:dev</pre>
</div>

  </div>

  <div class="section">
    <h2>🐳 Docker</h2>
    <div class="code-block">
<pre># Build da imagem
docker-compose build

# Subir aplicação

docker-compose up</pre>
</div>

  </div>

  <div class="section">
    <h2>⚙️ CI/CD com GitHub Actions</h2>
    <p>Este projeto já vem pronto para integração contínua:</p>
    <ul>
      <li>Build automático da aplicação</li>
      <li>Execução de testes</li>
      <li>Deploy automatizado</li>
    </ul>
    <p><strong>Arquivos:</strong></p>
    <ul>
      <li><code>.github/workflows/docker-images.yml</code></li>
      <li><code>.github/workflows/main.yml</code></li>
    </ul>
  </div>

</body>
</html>
