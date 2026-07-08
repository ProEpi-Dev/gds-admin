# AGENTS.md — GDS 2025 (Guardiões da Saúde)

Guia para agentes de IA trabalharem neste repositório.

## Visão geral

Monorepo da plataforma **Vigilância Participativa / Guardiões da Saúde (GDS)**: participantes registram sinais de saúde, visualizam mapas, consomem conteúdos educacionais e seguem trilhas de aprendizagem. Há painel administrativo e área do participante (`/app/*`).

| Pacote | Stack | Porta local |
|--------|-------|-------------|
| `backend/` | NestJS 10, Prisma 6, PostgreSQL, JWT | `3000` (`/v1`) |
| `frontend/` | React 19, Vite 7, MUI 7, TanStack Query | `5173` |
| `migrations/` | Flyway (schema SQL) | — |
| `k8s/`, `observabilidade/` | Deploy K8s, OpenTelemetry/Grafana | — |

**Gerenciador de pacotes:** Yarn (cada app tem seu próprio `package.json`).

## Bootstrap local

Ordem recomendada:

1. PostgreSQL: `gds-docker-local-dev/docker compose up -d`
2. Migrations: `migrations/` → `docker compose -f docker-compose_windows.yml up` (Windows) ou `docker-compose_linux.yml`
3. Backend: `cd backend && cp .env.example .env && yarn && yarn prisma generate && yarn start:dev`
4. Frontend: `cd frontend && yarn && yarn dev`
5. Setup inicial: `POST http://localhost:3000/v1/setup` → admin `admin@example.com` / `admin123`

**DATABASE_URL padrão:** `postgresql://gds_user:gds_password@localhost:5432/gds_db`

Swagger: `http://localhost:3000/api`

## Arquitetura da API

- Prefixo global: **`/v1`**
- Header obrigatório em requests autenticados: **`x-gds-channel: web`**
- Auth: JWT Bearer + refresh token rotativo (`user_refresh_token`)
- Guards globais: `JwtAuthGuard` + `RolesGuard` por endpoint
- Endpoints públicos: decorator `@Public()` (login, signup, setup, health)
- Schema: Flyway em `migrations/sql/` → Prisma client em `backend/prisma/schema.prisma`

### Domínios principais (`backend/src/`)

| Módulo | Responsabilidade |
|--------|------------------|
| `auth/`, `authz/` | Login, RBAC, permissões granulares |
| `contexts/`, `participations/` | Multi-tenant por contexto geográfico |
| `forms/`, `form-versions/`, `reports/` | Formulários dinâmicos e sinais (BEM/MAL) |
| `content/`, `content-types/`, `content-quiz/` | Biblioteca de conteúdos |
| `tracks/`, `track-cycles/`, `track-progress/` | Trilhas, ciclos e progresso sequencial |
| `syndromic-classification/` | Scores sindrômicos e export BI |
| `audit-log/` | Auditoria de ações administrativas |

### Roles

`admin`, `manager`, `content_manager`, `participant` — atribuídas por participação/contexto.

## Frontend — rotas do participante

| Rota | Página | APIs principais |
|------|--------|-----------------|
| `/app/inicio` | Home | pontos, formulários de sinal, profile-status, trilhas obrigatórias |
| `/app/conteudos` | Biblioteca | `GET /contents`, `GET /content-types` |
| `/app/aprenda` | Trilhas | `GET /track-cycles`, `GET /track-progress/my-progress` |

Arquivos-chave:

- Rotas: `frontend/src/routes/AppRoutes.tsx`
- Home: `frontend/src/features/app/pages/AppHomePage.tsx`
- HTTP client + refresh: `frontend/src/api/client.ts`
- Endpoints: `frontend/src/api/endpoints.ts` (nota: serviço de conteúdo usa `/contents`, não `/content`)

## Fluxo da home (`/app/inicio`)

Chamadas paralelas típicas após login:

```
GET /v1/reports/points?contextId=&startDate=&endDate=&limit=500
GET /v1/forms?contextId=&type=signal&page=1&pageSize=20&active=true
GET /v1/users/me/profile-status
GET /v1/track-progress/mandatory-compliance?participationId=
```

Mapa de pontos usa janela de **7 dias** e `limit=500`. Implementação otimizada em `reports.service.ts` → `fetchReportPointsRaw()` (SQL raw com índice parcial `idx_report_points_map`).

## Testes

| App | Comando | Framework |
|-----|---------|-----------|
| Backend | `yarn test` / `yarn test:cov` | Jest (~90% linhas) |
| Backend e2e | `yarn test:e2e` | Jest |
| Frontend | `yarn test` | Vitest |

Testes unitários ficam junto ao código (`*.spec.ts`). CI: `.github/workflows/tests.yml`.

## Convenções de código

- **Backend:** DTOs com class-validator; serviços usam Prisma; autorização via `AuthzService.resolveListContextId()`
- **Frontend:** TanStack Query para dados remotos; MUI para UI; i18next para traduções
- **Migrations:** nunca editar migrations já aplicadas — criar nova `Vxx__*.sql`
- **Commits:** só quando o usuário pedir explicitamente
- **Respostas ao usuário:** em português

### Complexidade ciclomática e Sonar

O CI roda **SonarQube** no backend. Além da cobertura, ele falha em funções com **complexidade cognitiva** acima do limite (regra `brain-overload`, **máximo 15 por função/método**). Na prática, trate **complexidade ciclomática/cognitiva** como o mesmo objetivo: poucos caminhos de decisão por bloco de código.

**Como manter baixa:**

- Uma responsabilidade por método; fluxo principal legível em poucas linhas.
- Extrair ramificações (`if` / `else` / `switch` / `try` aninhados, cache, montagem de `where`, paginação) para **métodos privados** com nomes que descrevem o passo (`resolveFindAllContextId`, `buildReportPointsWhereClause`, `mapReportsToPointDtos`).
- Preferir **early return** em vez de `else` profundos.
- Evitar “métodos deus” em serviços Nest e hooks React grandes.
- Ao alterar código legado, **reduzir complexidade antes** de acrescentar comportamento novo — senão o Sonar bloqueia o merge.

**Referência recente:** `forms.service.ts` (`findAll`) e `reports.service.ts` (`findPoints`) foram fatiados em helpers privados para ficar abaixo do limite 15.

## Scripts úteis

| Script | Uso |
|--------|-----|
| `cd backend && yarn openapi:export` | Atualiza `docs/swagger.yaml` a partir do NestJS Swagger |
| `backend/scripts/seed-dev-reports.ts` | Gera reports sintéticos para dev |
| `scripts/perf/home-load-test.mjs` | Teste de carga: 10 usuários na home + conteúdos + trilhas |
| `scripts/perf/db-bottleneck-analysis.mjs` | Análise de EXPLAIN e estatísticas do PostgreSQL |

## Performance — pontos de atenção no banco

Com base na análise do schema e queries da home:

1. **`GET /reports/points`** — query com JOIN `report` ↔ `participation` filtrada por `context_id` e janela temporal. Índices em `V20__idx_report_points_map.sql`. Plano pode varrer reports por data antes de filtrar contexto; monitorar com `EXPLAIN ANALYZE` quando `report` crescer.
2. **`GET /contents`** — `findMany` com `include` de tags/tipo; tabela pequena hoje usa seq scan (ok); composto `(context_id, active, track_exclusive)` seria útil em escala.
3. **`GET /track-progress/mandatory-compliance`** — múltiplas queries (participation, cycles, progress); N+1 controlado por slug.
4. **`GET /track-progress/my-progress`** — `findMany` com includes profundos (`track_cycle.track`, `participation.user`).
5. **Materialized views BI** (`V41`, schema `bi_export`) — `mv_participacao`, `mv_quiz_dados`, `mv_reportes`, `mv_reportes_semanal` (UNB); refresh na VPS1 para ADR 0007; não impactam a home, mas competem por I/O no refresh.

Rodar análise: `node scripts/perf/db-bottleneck-analysis.mjs`

## Observabilidade

OpenTelemetry opcional via variáveis `OTEL_*` no `.env` do backend. Stack local em `observabilidade/`.

## Deploy

- Branch `main` → produção (DigitalOcean)
- Branch `develop` → dev (Hostinger)
- Workflow: `.github/workflows/deploy.yml`
- Imagens: `ghcr.io/proepi-dev/gds-admin/{backend,frontend}`

## O que evitar

- Não commitar `.env` ou secrets
- Não usar `prisma migrate` para alterar schema — usar Flyway
- Não criar markdown/docs não solicitados
- Não alterar migrations Flyway já aplicadas em produção
