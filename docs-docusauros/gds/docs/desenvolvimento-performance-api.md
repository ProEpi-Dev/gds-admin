---
sidebar_position: 5
title: Desenvolvimento — performance da API
description: Cache em memória, pool Prisma, índices de mapa e variáveis de ambiente usadas na carga da home do participante.
---

# Desenvolvimento — performance da API

Notas para quem opera ou desenvolve o backend NestJS (`backend/`). Complementa [Modelo de Banco de Dados — índices](/arquitetura/modelagem-banco-dados/modelo-banco-dados#índices-e-performance).

## Cabeçalho e pool

| Tema | Detalhe |
|------|---------|
| **`x-gds-channel`** | Obrigatório em pedidos autenticados (ex.: `web`, `app`). |
| **`DATABASE_URL`** | Recomenda-se `connection_limit` e `pool_timeout` na URL (ex.: `?connection_limit=20&pool_timeout=30`). Ver `backend/.env.example`. |

## Carga típica da home (`/app/inicio`)

Chamadas paralelas após login (participante):

| Endpoint | Notas |
|----------|--------|
| `GET /v1/reports/points` | Janela ~7 dias; `limit` padrão **500** (teto configurável). SQL otimizado com índice parcial `idx_report_points_map` (**`V20__idx_report_points_map.sql`**). |
| `GET /v1/forms?type=signal` | Listagem paginada de formulários de sinal do contexto. |
| `GET /v1/users/me/profile-status` | Completude de perfil. |
| `GET /v1/track-progress/mandatory-compliance` | Trilhas obrigatórias. |

## Cache em memória (por processo)

TTL em segundos via variáveis de ambiente (`0` = desligado). Em **várias réplicas** Kubernetes cada pod mantém cache próprio.

| Variável | Default típico | Escopo |
|----------|----------------|--------|
| `REPORTS_POINTS_CACHE_TTL_SECONDS` | 90 | Mapa de pontos por contexto + janela de datas; **invalidado** ao criar report no contexto |
| `FORMS_SIGNAL_CACHE_TTL_SECONDS` | 3600 | Listagem `type=signal` (sem `reference`); limpo em create/update/delete de formulário |
| `CONTENT_TYPES_CACHE_TTL_SECONDS` | 3600 | `GET` tipos ativos; limpo em mutações admin |
| `TRACK_CYCLES_CACHE_TTL_SECONDS` | 300 | Listagem de ciclos (filtro simples); limpo em mutações de ciclo |

Documentação das variáveis: `backend/.env.example`.

## Agregados de frequência (reports)

Tabelas **`participation_report_day`** e **`participation_report_streak`** (**`V18__report_streaks.sql`**) são atualizadas por **incremento** ao criar report (não por re-scan completo do dia).

## Classificação sindrômica no `create`

O disparo assíncrono `triggerClassification` ocorre apenas para reports **`NEGATIVE`** na criação (alinhado ao escopo `SYNDROMIC_CLASSIFICATION_REPORT_TYPE`). Ver [Classificação sindrômica](/arquitetura/modelagem-banco-dados/classificacao-sindromica).

## Listagem de conteúdos (participante)

`GET /v1/contents` para quem não tem `content:write` retorna **`select` sem o campo HTML `content`** (só metadados + `content_type`), reduzindo payload na biblioteca `/app/conteudos`.

## BI / Metabase (fora da home)

Views materializadas **`mv_bi_weekly_reports`** e **`mv_bi_quiz_submissions`** (**`V41__bi_materialized_views.sql`**) servem dashboards Metabase; exigem `REFRESH` operacional. O export JSON sindrômico (`x-api-key`) é independente — ver [Integração BI](/integracao-bi-export-sindromico).

## Análise local

Scripts em `scripts/perf/` do monorepo (ex.: `home-load-test.mjs`, `db-bottleneck-analysis.mjs`). Guia para agentes: `AGENTS.md` na raiz do repositório.

---

**Última atualização**: Junho 2026
