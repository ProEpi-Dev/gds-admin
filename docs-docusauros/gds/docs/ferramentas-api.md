---
sidebar_position: 7
title: Ferramentas — API (Swagger e Bruno)
description: Como explorar e testar a API REST com Swagger e a coleção Bruno do repositório.
---

# Ferramentas — API (Swagger e Bruno)

## Swagger (OpenAPI)

Com o backend em execução:

| Ambiente | URL |
|----------|-----|
| Local | `http://localhost:3000/api` |

Prefixo das rotas: **`/v1`**. Autenticação: **Bearer JWT** + **`x-gds-channel: web`**.

O ficheiro estático **`docs/swagger.yaml`** no monorepo é gerado a partir do código:

```bash
cd backend && yarn openapi:export
```

Regenerar após alterar controllers/DTOs com `@ApiProperty` / `@ApiOperation`. Em desenvolvimento, o Swagger interativo em `http://localhost:3000/api` usa a mesma configuração (`backend/src/openapi/build-openapi-document.ts`).

## Coleção Bruno

Caminho no repositório:

```text
docs/gds-bruno-collection/Vigilância Participativa API/
```

### Configuração

1. Abra a pasta no [Bruno](https://www.usebruno.com/).
2. Selecione o ambiente **Local** (`baseUrl`: `http://localhost:3000/v1`) ou **Dev server** / **Production server**.
3. Execute **auth → login** para gravar `{{token}}` (variável de coleção).
4. A coleção envia **`x-gds-channel: web`** em todos os pedidos (definido em `collection.bru`).

### Pedidos destacados (área participante / ops)

| Pasta | Pedido | Rota |
|-------|--------|------|
| `auth` | login, setup | `/auth/login`, `/setup` |
| `reports` | Pontos do mapa | `GET /reports/points` |
| `users` | Mesclar duplicados (dry run / executar) | `POST /users/merge-duplicates` |
| `users` | Profile status | `GET /users/me/profile-status` |
| `bi` | Export sindrômico | `GET /syndromic-classification/reports/bi-export-scores` + `x-api-key` |

Documentação do merge: [Operações — usuários duplicados](/operacoes-usuarios-duplicados).

### Variáveis úteis

| Variável | Origem |
|----------|--------|
| `{{baseUrl}}` | Ambiente Bruno |
| `{{token}}` | Script pós-login em `auth/login/auth.bru` |
| `{{chave_api_bi}}` | Definir manualmente no ambiente para export BI |

---

**Última atualização**: Junho 2026
