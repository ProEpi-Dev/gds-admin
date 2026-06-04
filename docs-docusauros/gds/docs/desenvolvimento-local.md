---
sidebar_position: 6
title: Desenvolvimento local
description: Bootstrap do monorepo GDS 2025 — PostgreSQL, Flyway, backend, frontend e setup inicial.
---

# Desenvolvimento local

Guia rápido para subir o **monorepo** `gds-2025` (backend NestJS + frontend React + migrations Flyway). Detalhes de ambiente publicado: [Ambientes](/ambientes).

## Pré-requisitos

- Node.js 20+
- Yarn (cada app tem seu `package.json`)
- Docker (PostgreSQL local e, opcionalmente, stack de observabilidade)

## Ordem de bootstrap

### 1. PostgreSQL

```bash
cd gds-docker-local-dev
docker compose up -d
```

`DATABASE_URL` padrão: `postgresql://gds_user:gds_password@localhost:5432/gds_db`

### 2. Migrations (Flyway)

```bash
cd migrations
# Windows:
docker compose -f docker-compose_windows.yml up
# Linux:
docker compose -f docker-compose_linux.yml up
```

Não use `prisma migrate` para alterar schema — novas mudanças em `migrations/sql/Vxx__*.sql`.

### 3. Backend

```bash
cd backend
cp .env.example .env
yarn
yarn prisma generate
yarn start:dev
```

- API: `http://localhost:3000/v1`
- Swagger: `http://localhost:3000/api`

### 4. Frontend

```bash
cd frontend
yarn
yarn dev
```

- App: `http://localhost:5173` (admin e `/app` participante)

### 5. Setup inicial (admin)

```http
POST http://localhost:3000/v1/setup
Content-Type: application/json
x-gds-channel: web

{}
```

Credenciais padrão após setup: `admin@example.com` / `admin123`

## Cabeçalhos da API

| Cabeçalho | Quando |
|-----------|--------|
| `Authorization: Bearer {token}` | Rotas autenticadas |
| `x-gds-channel` | **Obrigatório** — `web` (console/Bruno) ou `app` (mobile) |

## Testes

| App | Comando |
|-----|---------|
| Backend unitário | `cd backend && yarn test` |
| Backend e2e | `cd backend && yarn test:e2e` |
| Frontend | `cd frontend && yarn test` |

## Monorepo e agentes

O ficheiro **`AGENTS.md`** na raiz do repositório resume arquitetura, rotas `/app`, performance da home e scripts em `scripts/perf/`.

---

**Última atualização**: Junho 2026
