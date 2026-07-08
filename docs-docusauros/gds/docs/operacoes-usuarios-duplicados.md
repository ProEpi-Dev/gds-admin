---
sidebar_position: 4
title: Operações — mesclar usuários duplicados
description: Endpoint administrativo provisório e scripts SQL para cadastros legados repetidos antes da verificação de e-mail.
---

# Operações — mesclar usuários duplicados

:::caution Ferramenta provisória

Este fluxo corrige **duplicatas históricas** (vários `user` para a mesma pessoa antes da verificação de e-mail). Não substitui cadastro normal. Remova o endpoint quando a base estiver saneada.

:::

Guia operacional completo (SQL manual, troubleshooting): **`docs/resolvendo-duplicados/README.md`** no repositório. Testes via [Ferramentas — API (Bruno)](/ferramentas-api).

## API

| Aspecto | Detalhe |
|--------|---------|
| **Rota** | `POST /v1/users/merge-duplicates` |
| **Papel** | `admin` |
| **Cabeçalhos** | `Authorization: Bearer {token}`, `x-gds-channel: web` |
| **Corpo** | `canonicalUserId`, `duplicateUserIds[]`, `dryRun?`, `canonicalEmail?` |
| **Auditoria** | `USER_MERGE` em `admin_action_log` |

### Campos do corpo

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `canonicalUserId` | Sim | Utilizador que permanece |
| `duplicateUserIds` | Sim | IDs a mesclar e remover (mín. 1) |
| `dryRun` | Não | `true` = validação + `preMergeStats` sem alterar dados |
| `canonicalEmail` | Não | E-mail final do canônico (ex.: `joao@example.com`) |

### Erros comuns

| HTTP | Motivo |
|------|--------|
| 400 | Canônico na lista de duplicados |
| 404 | ID inexistente |
| 409 | `canonicalEmail` já usado por outro utilizador |
| 500 | Função SQL ausente no banco |

## Fluxo recomendado

1. **Login admin** — `POST /v1/auth/login`
2. **Listar candidatos** — `GET /v1/users?search=...`
3. **Dry run** — `POST /users/merge-duplicates` com `"dryRun": true`
4. **Executar** — mesmo endpoint sem `dryRun`; opcional `canonicalEmail`
5. **Auditoria** — `GET /v1/audit-logs?search=USER_MERGE`

Em `preMergeStats`, `participationsByUser` lista **uma linha por participação** (`count` = 1); volumes de reports estão em `reportsByParticipation`.

## Exemplo curl

```bash
BASE_URL="http://localhost:3000"
TOKEN="..." # após login admin

curl -s -X POST "$BASE_URL/v1/users/merge-duplicates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-gds-channel: web" \
  -H "Content-Type: application/json" \
  -d '{
    "canonicalUserId": 100,
    "duplicateUserIds": [101],
    "dryRun": true
  }'

curl -s -X POST "$BASE_URL/v1/users/merge-duplicates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-gds-channel: web" \
  -H "Content-Type: application/json" \
  -d '{
    "canonicalUserId": 100,
    "duplicateUserIds": [101],
    "canonicalEmail": "joao@example.com"
  }'
```

## Pré-requisitos no PostgreSQL

Funções (instalação manual se o ambiente ainda não tiver):

```bash
psql "$DATABASE_URL" -f docs/resolvendo-duplicados/_merge_participation_activity.sql
psql "$DATABASE_URL" -f docs/resolvendo-duplicados/merge_duplicate_users.sql
```

| Função | Ficheiro |
|--------|----------|
| `_merge_participation_activity` | `_merge_participation_activity.sql` |
| `merge_duplicate_users` | `merge_duplicate_users.sql` |

## O que o merge faz

**`merge_duplicate_users`**

1. Valida canônico e duplicados
2. Por duplicado: reatribui participations sem colisão de contexto; senão mescla atividade e remove participation duplicada
3. Reatribui FKs (`content`, `user_legal_acceptance`, `user_refresh_token`, `syndrome_bi_export_api_key`)
4. Remove registros `user` dos duplicados

**`_merge_participation_activity`** — unifica `track_progress`, `quiz_submission`, `report`, agregados de frequência, `participation_role`, etc.

O backend executa a SP e eventual `UPDATE` de e-mail na **mesma transação** Prisma.

## Remoção futura

1. Remover endpoint em `users.controller.ts` / `users.service.ts`
2. Dropar funções SQL (opcional)
3. Arquivar `docs/resolvendo-duplicados` e esta página

---

**Última atualização**: Junho 2026
