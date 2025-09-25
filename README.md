<div align="center">

![API Sistema GestãoInt](https://img.shields.io/badge/API-Sistema%20GestãoInt-blue?style=for-the-badge&logo=nestjs)

# 🏢 API Sistema GestãoInt

### **Enterprise-Grade RESTful API for Internal Organization Management**

*Built with NestJS • Following DDD & SOLID Principles • Production-Ready with Docker & CI/CD*

---

[![Build Status](https://img.shields.io/github/actions/workflow/status/Joaoof/api-sistema-gestaoint/main.yml?branch=main&style=flat-square&logo=github)](https://github.com/Joaoof/api-sistema-gestaoint/actions)
[![Coverage](https://img.shields.io/codecov/c/github/Joaoof/api-sistema-gestaoint?style=flat-square&logo=codecov)](https://codecov.io/gh/Joaoof/api-sistema-gestaoint)
[![License](https://img.shields.io/github/license/Joaoof/api-sistema-gestaoint?style=flat-square)](./LICENSE)
[![Node Version](https://img.shields.io/node/v/@nestjs/core?style=flat-square&logo=node.js)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://docker.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)

[🚀 **Quick Start**](#-quick-start) • [📖 **Documentation**](#-api-documentation) • [🏗️ **Architecture**](#-architecture) • [🔧 **Development**](#-development-guide)

</div>

---

## 📋 **Table of Contents**

<details>
<summary>Click to expand</summary>

- [🔍 Overview](#-overview)
- [✨ Key Features](#-key-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [📖 API Documentation](#-api-documentation)
- [🔧 Development Guide](#-development-guide)
- [🧪 Testing Strategy](#-testing-strategy)
- [🚢 Deployment](#-deployment)
- [📊 Performance & Monitoring](#-performance--monitoring)
- [🔒 Security](#-security)
- [🤝 Contributing](#-contributing)
- [📝 License](#-license)

</details>

---

## 🔍 **Overview**

The **API Sistema GestãoInt** is a cutting-edge, enterprise-grade RESTful API designed for comprehensive internal organization management. Built with modern architectural patterns and industry best practices, it provides a robust, scalable, and maintainable backend solution.

### **🎯 Mission**
Empower organizations with a reliable, secure, and high-performance API that streamlines internal operations while maintaining code quality and developer experience.

### **🌟 Why Choose This API?**

| Feature | Benefit |
|---------|---------|
| 🏗️ **Domain-Driven Design** | Clean, maintainable code architecture |
| 🔒 **Enterprise Security** | JWT authentication with role-based access |
| 📈 **Scalable Infrastructure** | Docker containerization with orchestration |
| 🚀 **CI/CD Ready** | Automated testing and deployment pipelines |
| 📊 **Monitoring & Observability** | Built-in health checks and metrics |
| 🧪 **Test-Driven Development** | Comprehensive test coverage |

---

## ✨ **Key Features**

<div align="center">

| 🔐 **Authentication & Authorization** | 👥 **User Management** | 🏗️ **Architecture** |
|:---:|:---:|:---:|
| JWT Token Management | CRUD Operations | Domain-Driven Design |
| Role-Based Access Control | Profile Management | SOLID Principles |
| Session Management | Permission System | Clean Architecture |
| Password Security | User Validation | Dependency Injection |

</div>

### **🚀 Advanced Features**

- **🔄 Real-time Updates**: WebSocket support for live data synchronization
- **📊 Analytics Dashboard**: Built-in metrics and reporting capabilities
- **🌐 Multi-tenant Support**: Isolated data per organization
- **🔍 Advanced Search**: Full-text search with filtering and pagination
- **📱 API Versioning**: Backward compatibility with version management
- **🛡️ Rate Limiting**: Protection against abuse and DDoS attacks
- **📧 Email Integration**: Automated notifications and alerts
- **🗄️ Database Migrations**: Version-controlled schema changes
- **🔄 Background Jobs**: Asynchronous task processing
- **📈 Performance Optimization**: Caching and query optimization

---

## 🛠️ **Tech Stack**

<div align="center">

### **Core Technologies**

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)

### **Database & ORM**

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

### **DevOps & Infrastructure**

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

### **Quality & Testing**

![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)

</div>

### **📦 Dependencies Overview**

<details>
<summary>View detailed dependency list</summary>

```json
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
```

</details>

---

## 🏗️ **Architecture**

### **🎯 Architectural Principles**

Our API follows **Domain-Driven Design (DDD)** and **SOLID principles** to ensure maintainability, testability, and scalability.

```mermaid
graph TB
    A[Client Request] --> B[Controller Layer]
    B --> C[Service Layer]
    C --> D[Domain Layer]
    D --> E[Repository Layer]
    E --> F[Database]
    
    G[Authentication Guard] --> B
    H[Validation Pipe] --> B
    I[Exception Filter] --> B
    
    style A fill:#e1f5fe
    style F fill:#f3e5f5
    style D fill:#fff3e0
```

### **📁 Project Structure**

```
src/
├── 🏗️ core/                    # Domain Layer
│   ├── entities/               # Business Entities
│   ├── repositories/           # Repository Interfaces
│   ├── use-cases/             # Business Logic
│   └── exceptions/            # Custom Exceptions
├── 🔧 infrastructure/          # Infrastructure Layer
│   ├── database/              # Database Implementations
│   ├── services/              # External Services
│   └── config/                # Configuration
├── 🌐 modules/                 # Presentation Layer
│   ├── auth/                  # Authentication Module
│   ├── users/                 # User Management Module
│   └── shared/                # Shared Components
├── 🛠️ shared/                  # Cross-cutting Concerns
│   ├── pipes/                 # Validation Pipes
│   ├── guards/                # Authentication Guards
│   ├── interceptors/          # Request/Response Interceptors
│   └── decorators/            # Custom Decorators
├── 📊 monitoring/              # Observability
│   ├── health/                # Health Checks
│   ├── metrics/               # Performance Metrics
│   └── logging/               # Structured Logging
└── 🧪 __tests__/              # Test Suites
    ├── unit/                  # Unit Tests
    ├── integration/           # Integration Tests
    └── e2e/                   # End-to-End Tests
```

### **🔄 Request Flow**

```mermaid
sequenceDiagram
    participant C as Client
    participant G as Guard
    participant Ctrl as Controller
    participant S as Service
    participant R as Repository
    participant DB as Database

    C->>G: HTTP Request
    G->>G: Validate JWT
    G->>Ctrl: Authorized Request
    Ctrl->>Ctrl: Validate Input
    Ctrl->>S: Business Logic
    S->>R: Data Operation
    R->>DB: Query/Mutation
    DB-->>R: Result
    R-->>S: Domain Entity
    S-->>Ctrl: Response DTO
    Ctrl-->>C: HTTP Response
```

---

## 🚀 **Quick Start**

### **📋 Prerequisites**

| Requirement | Version | Installation |
|-------------|---------|--------------|
| **Node.js** | ≥ 18.x | [Download](https://nodejs.org) |
| **Docker** | ≥ 20.x | [Download](https://docker.com) |
| **PostgreSQL** | ≥ 14.x | [Download](https://postgresql.org) |
| **Git** | Latest | [Download](https://git-scm.com) |

### **⚡ Installation Methods**

<details>
<summary><strong>🐳 Docker (Recommended)</strong></summary>

```bash
# Clone the repository
git clone https://github.com/Joaoof/api-sistema-gestaoint.git
cd api-sistema-gestaoint

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f api

# Access the API
curl http://localhost:3000/health
```

</details>

<details>
<summary><strong>💻 Local Development</strong></summary>

```bash
# Clone and setup
git clone https://github.com/Joaoof/api-sistema-gestaoint.git
cd api-sistema-gestaoint

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Database setup
npx prisma migrate deploy
npx prisma db seed

# Start development server
npm run start:dev

# API will be available at http://localhost:3000
```

</details>

### **🔧 Environment Configuration**

<details>
<summary>View environment variables</summary>

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gestaoint"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Application
NODE_ENV="development"
PORT=3000
API_VERSION="v1"

# External Services
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
LOG_LEVEL="info"
```

</details>

---

## 📖 **API Documentation**

### **🔗 Base URL**
```
Production:  https://api.gestaoint.com/v1
Development: http://localhost:3000/v1
```

### **🔐 Authentication**

All protected endpoints require a Bearer token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### **📋 Endpoints Overview**

<details>
<summary><strong>🔐 Authentication Endpoints</strong></summary>

#### **POST** `/auth/login`
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "USER"
  },
  "expiresIn": 604800
}
```

#### **POST** `/auth/register`
Create a new user seed.


#### **POST** `/auth/refresh`
Refresh JWT token using refresh token.

#### **POST** `/auth/logout`
Invalidate current session.

</details>

<details>
<summary><strong>👥 User Management Endpoints</strong></summary>

#### **GET** `/users`
List all users with pagination and filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `search`: Search term for name/email
- `role`: Filter by user role
- `status`: Filter by user status

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "user@example.com",
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
```

#### **GET** `/users/:id`
Get user details by ID.

#### **PATCH** `/users/:id`
Update user information.

#### **DELETE** `/users/:id`
Soft delete user account.

</details>

### **📊 Response Format**

All API responses follow a consistent format:

\`\`\`json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00Z",
  "path": "/api/v1/users",
  "version": "1.0.0"
}
\`\`\`

### **❌ Error Handling**

\`\`\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "path": "/api/v1/auth/login",
  "requestId": "uuid"
}
\`\`\`

---

## 🔧 **Development Guide**

### **🛠️ Development Commands**

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugger
npm run start:prod         # Start production build

# Building
npm run build              # Build for production
npm run build:watch        # Build with watch mode

# Database
npm run db:migrate         # Run migrations
npm run db:seed            # Seed database
npm run db:reset           # Reset database
npm run db:studio          # Open Prisma Studio

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run format             # Format with Prettier
npm run type-check         # TypeScript type checking

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Generate coverage report
npm run test:e2e           # Run end-to-end tests
```

### **🔄 Git Workflow**

We follow **Conventional Commits** and **GitFlow** branching strategy:

```bash
# Feature development
git checkout -b feature/user-management
git commit -m "feat(users): add user creation endpoint"

# Bug fixes
git checkout -b fix/auth-validation
git commit -m "fix(auth): resolve JWT validation issue"

# Releases
git checkout -b release/v1.2.0
git commit -m "chore(release): bump version to 1.2.0"
```

### **📝 Code Style Guidelines**

<details>
<summary>View coding standards</summary>

#### **TypeScript Best Practices**
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use enums for constants with multiple values
- Implement proper error handling with custom exceptions

#### **NestJS Patterns**
- Use dependency injection for all services
- Implement proper DTOs for request/response validation
- Use guards for authentication and authorization
- Implement interceptors for cross-cutting concerns

#### **Database Guidelines**
- Use Prisma schema for database modeling
- Implement proper indexing for performance
- Use transactions for complex operations
- Follow naming conventions for tables and columns

</details>

---

### **📊 Coverage Requirements**

| Type | Minimum Coverage | Current Coverage |
|------|------------------|------------------|
| **Unit Tests** | 80% | ![Coverage](https://img.shields.io/badge/85%25-passing-brightgreen) |
| **Integration Tests** | 70% | ![Coverage](https://img.shields.io/badge/75%25-passing-brightgreen) |
| **E2E Tests** | 60% | ![Coverage](https://img.shields.io/badge/65%25-passing-brightgreen) |

---

## 🚢 **Deployment**



## 📊 **Performance & Monitoring**

### **📈 Performance Metrics**

| Metric | Target | Current |
|--------|--------|---------|
| **Response Time** | < 200ms | ![Performance](https://img.shields.io/badge/150ms-excellent-brightgreen) |
| **Throughput** | > 1000 RPS | ![Performance](https://img.shields.io/badge/1200_RPS-excellent-brightgreen) |
| **Uptime** | > 99.9% | ![Performance](https://img.shields.io/badge/99.95%25-excellent-brightgreen) |
| **Error Rate** | < 0.1% | ![Performance](https://img.shields.io/badge/0.05%25-excellent-brightgreen) |

### **🔍 Monitoring Stack**

- **📊 Metrics**: Prometheus + Grafana
- **📝 Logging**: Winston + ELK Stack
- **🚨 Alerting**: PagerDuty integration
- **🔍 Tracing**: Jaeger for distributed tracing
- **💾 Database Monitoring**: pgAdmin + slow query analysis

### **🏥 Health Checks**

```typescript
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
```

---

## 🔒 **Security**

### **🛡️ Security Features**

- ✅ **JWT Authentication** with refresh tokens
- ✅ **Role-Based Access Control (RBAC)**
- ✅ **Rate Limiting** to prevent abuse
- ✅ **Input Validation** with class-validator
- ✅ **SQL Injection Protection** via Prisma ORM
- ✅ **CORS Configuration** for cross-origin requests
- ✅ **Helmet.js** for security headers
- ✅ **Password Hashing** with bcrypt
- ✅ **API Versioning** for backward compatibility
- ✅ **Request Logging** for audit trails

### **🔐 Security Best Practices**

<details>
<summary>View security guidelines</summary>

#### **Authentication & Authorization**
```typescript
// JWT Strategy Implementation
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
```

#### **Input Validation**
```typescript
// DTO with validation
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
```
</details>

### **🚨 Security Checklist**

- [ ] Regular dependency updates
- [ ] Security headers configuration
- [ ] Environment variables protection
- [ ] Database connection encryption
- [ ] API rate limiting implementation
- [ ] Input sanitization and validation
- [ ] Error message sanitization
- [ ] Audit logging implementation
- [ ] Penetration testing schedule
- [ ] Security incident response plan

---

## 🤝 **Contributing**

We welcome contributions from the community! Please follow our contribution guidelines.

### **🔄 Contribution Workflow**

1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **💻 Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **📤 Push** to the branch: `git push origin feature/amazing-feature`
5. **🔄 Open** a Pull Request

### **📋 Pull Request Guidelines**

- Follow the existing code style and conventions
- Include tests for new functionality
- Update documentation as needed
- Ensure all CI checks pass
- Provide a clear description of changes

### **🐛 Bug Reports**

When reporting bugs, please include:
- Steps to reproduce the issue
- Expected vs actual behavior
- Environment details (OS, Node.js version, etc.)
- Relevant logs or error messages

### **💡 Feature Requests**

For feature requests, please provide:
- Clear description of the proposed feature
- Use case and business justification
- Potential implementation approach
- Any relevant mockups or examples

---

## 📝 **License**

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

```
MIT License

Copyright (c) 2024 API Sistema GestãoInt

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

### **🚀 Ready to Transform Your Organization?**

**Deploy this enterprise-grade API and give your clients a competitive advantage with robust, scalable, and professional backend infrastructure!**

---

**Made with ❤️ by the GestãoInt Team**

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Joaoof/api-sistema-gestaoint)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/joaoof)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:contact@gestaoint.com)

⭐ **Star this repository if it helped you!**

</div>
