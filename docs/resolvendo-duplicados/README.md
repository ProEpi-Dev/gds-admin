# Resolvendo usuários duplicados

Documentação **provisória** para mesclar contas duplicadas criadas antes da verificação de e-mail. Quando esse cenário deixar de ocorrer, este fluxo e as funções SQL podem ser removidos.

**Documentação publicada (Docusaurus):** [Operações — mesclar usuários duplicados](https://proepi-dev.github.io/gds-admin/operacoes-usuarios-duplicados) (site `docs-docusauros/gds`).

## Contexto

Antes da validação de e-mail, usuários que esqueciam a senha tentavam recuperá-la com um endereço que não existia no sistema (variação de caixa, typo etc.) e acabavam se cadastrando de novo — às vezes mais de uma vez. Isso gerou registros duplicados da mesma pessoa, por exemplo:

- `joao@example.com`
- `Joao@example.com`

A solução é escolher um usuário **canônico** (principal), mesclar os dados dos duplicados nele e remover as contas extras. A lógica pesada está nas funções PostgreSQL documentadas nesta pasta; a API expõe um endpoint admin para executar o merge com auditoria.

## Pré-requisitos no banco

As funções abaixo **precisam existir** no PostgreSQL do ambiente (criadas manualmente em produção):

| Arquivo | Função |
|---------|--------|
| [`_merge_participation_activity.sql`](./_merge_participation_activity.sql) | `_merge_participation_activity(dup_part_id, canon_part_id)` |
| [`merge_duplicate_users.sql`](./merge_duplicate_users.sql) | `merge_duplicate_users(canonical_user_id, duplicate_user_ids[])` |

Ordem de instalação manual (se necessário em outro ambiente):

```bash
psql "$DATABASE_URL" -f docs/resolvendo-duplicados/_merge_participation_activity.sql
psql "$DATABASE_URL" -f docs/resolvendo-duplicados/merge_duplicate_users.sql
```

Para inspecionar se já existem:

```sql
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('merge_duplicate_users', '_merge_participation_activity');
```

## Fluxo recomendado (via API)

Todos os pedidos autenticados exigem **`x-gds-channel: web`** (ou `app` no mobile).

### 1. Autenticar como admin

```http
POST /v1/auth/login
Content-Type: application/json
x-gds-channel: web

{
  "email": "admin@example.com",
  "password": "senha"
}
```

Guarde o `token` retornado.

### 2. Localizar candidatos duplicados

```http
GET /v1/users?search=joao
Authorization: Bearer {token}
x-gds-channel: web
```

Anote os IDs. Escolha o **canônico** — em geral o que tiver mais atividade ou o cadastro mais recente/correto.

### 3. Simular (dry run)

Valida IDs e retorna estatísticas **sem** alterar o banco:

```http
POST /v1/users/merge-duplicates
Authorization: Bearer {token}
x-gds-channel: web
Content-Type: application/json

{
  "canonicalUserId": 100,
  "duplicateUserIds": [101],
  "dryRun": true
}
```

Revise `users`, `preMergeStats.participationsByUser` (uma linha por participação), `reportsByParticipation` e `quizSubmissionsByParticipation`.

### 4. Executar o merge

```http
POST /v1/users/merge-duplicates
Authorization: Bearer {token}
x-gds-channel: web
Content-Type: application/json

{
  "canonicalUserId": 100,
  "duplicateUserIds": [101],
  "canonicalEmail": "joao@example.com"
}
```

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `canonicalUserId` | Sim | ID do usuário que permanece |
| `duplicateUserIds` | Sim | IDs a mesclar e remover (array, mínimo 1) |
| `canonicalEmail` | Não | Normaliza o e-mail do canônico após o merge (ex.: minúsculas) |
| `dryRun` | Não | `true` = só simulação |

**Resposta de sucesso (200):** inclui `mergeLog` (passos da stored procedure), `preMergeStats`, `postMergeStats` e `canonicalUser`.

**Erros comuns:**

| Status | Motivo |
|--------|--------|
| 400 | Canônico na lista de duplicados ou payload inválido |
| 404 | Algum ID não existe |
| 409 | `canonicalEmail` já usado por outro usuário |
| 500 | Função SQL ausente no banco ou erro interno da procedure |

### 5. Confirmar auditoria

A ação é registrada em `admin_action_log` com `action = 'USER_MERGE'`:

```http
GET /v1/audit-logs?search=USER_MERGE
Authorization: Bearer {token}
x-gds-channel: web
```

## Exemplo com curl

```bash
TOKEN="..." # token do login admin
BASE_URL="http://localhost:3000"

# Simular
curl -s -X POST "$BASE_URL/v1/users/merge-duplicates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-gds-channel: web" \
  -H "Content-Type: application/json" \
  -d '{
    "canonicalUserId": 100,
    "duplicateUserIds": [101],
    "dryRun": true
  }' | jq .

# Executar
curl -s -X POST "$BASE_URL/v1/users/merge-duplicates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-gds-channel: web" \
  -H "Content-Type: application/json" \
  -d '{
    "canonicalUserId": 100,
    "duplicateUserIds": [101],
    "canonicalEmail": "joao@example.com"
  }' | jq .
```

Coleção Bruno: `docs/gds-bruno-collection/.../users/Mesclar usuarios duplicados*.bru`

## O que o merge faz (resumo)

**`merge_duplicate_users`**

1. Valida canônico e duplicados
2. Por cada duplicado:
   - Participations em contextos **sem colisão** → reatribui `user_id` ao canônico
   - Participations no **mesmo contexto** → chama `_merge_participation_activity` e remove a participation duplicada
   - Reatribui FKs: `content`, `user_legal_acceptance`, `user_refresh_token`, `syndrome_bi_export_api_key`
3. Remove os registros em `"user"` dos duplicados

**`_merge_participation_activity`**

Mescla atividade entre duas participations do mesmo contexto: `track_progress`, `quiz_submission`, `report`, `participation_profile_extra`, `participation_report_day`, `participation_report_streak`, `participation_role`.

## Procedimento manual SQL (histórico)

Antes do endpoint, o merge era feito direto no psql. Mantido aqui só como referência.

```sql
-- 1) Identificar duplicados
SELECT id, email, created_at
FROM "user"
WHERE LOWER(email) LIKE 'joao@example.com%'
ORDER BY id;

-- 2) Checagens pré-merge (substituir IDs)
SELECT user_id, id AS participation_id
FROM participation
WHERE user_id IN (101, 100)
ORDER BY user_id, id;

SELECT participation_id, COUNT(*)::int
FROM report
WHERE participation_id IN (
  SELECT id FROM participation WHERE user_id IN (101, 100)
)
GROUP BY participation_id;

SELECT participation_id, COUNT(*)::int
FROM quiz_submission
WHERE participation_id IN (
  SELECT id FROM participation WHERE user_id IN (101, 100)
)
GROUP BY participation_id;

-- 3) Executar merge (transação)
BEGIN;

SELECT * FROM merge_duplicate_users(
  p_canonical_user_id  := 100,
  p_duplicate_user_ids := ARRAY[101]::INT[]
);

-- Conferir resultado; se OK:
COMMIT;
-- Senão:
-- ROLLBACK;

-- 4) Pós-merge (opcional: normalizar e-mail)
UPDATE "user"
SET email = 'joao@example.com'
WHERE id = 100;
```

Log típico da procedure:

```
 action                  | detail
-------------------------+-----------------------------------
 start                   | canonical=100 duplicates={101}
 merge_participation     | dup=... -> canon=...
 reassigned_user_fks     | dup_user=101
 deleted_duplicate_users | ids={101}
 done                    | merge concluido
```

## Swagger

O endpoint aparece em `/api` (Swagger) como **`POST /v1/users/merge-duplicates`**, marcado como provisório.

## Remoção futura

Quando não houver mais duplicados legados para tratar:

1. Remover o endpoint em `backend/src/users/users.controller.ts` e o método em `users.service.ts`
2. Dropar as funções no banco (se desejado)
3. Remover ou arquivar esta pasta `docs/resolvendo-duplicados`
4. Remover a página no Docusaurus `operacoes-usuarios-duplicados.md`
