---
sidebar_position: 3
title: Integração BI — export sindrômico
description: Como consumir o endpoint público de exportação de scores para ferramentas de BI, autenticação por chave de API e geração da chave no console administrativo.
---

# Integração BI — export de scores sindrómicos

Este guia descreve como **integrar ferramentas de BI** (Power BI, Metabase, pipelines ETL, scripts, etc.) com o endpoint **JSON** de exportação de **scores de classificação sindrômica**, incluindo **como gerar e revogar a chave de API** no console de administração.

:::info Onde está a API

As URLs base por ambiente estão em **[Ambientes (desenvolvimento e produção)](ambientes)**. Todas as rotas REST usam o prefixo **`/v1`**.

:::

:::info Conceito de negócio

Para o modelo de dados, motor de score e telas de configuração, veja **[Classificação sindrômica](arquitetura/modelagem-banco-dados/classificacao-sindromica)**.

:::

---

## Visão geral

| Aspecto | Detalhe |
|--------|---------|
| **Endpoint de export** | `GET /v1/syndromic-classification/reports/bi-export-scores` |
| **Autenticação** | Cabeçalho **`x-api-key`** (não usa JWT de utilizador) |
| **Formato da chave** | `publicId.secret` (UUID público + segredo) — o segredo só é mostrado **uma vez** na criação |
| **Contexto dos dados** | A chave fica **vinculada a um `context_id`**. O export devolve apenas reports desse contexto |
| **Limite de linhas** | Até **10 000** itens por pedido (ordenados por data do report) |

O endpoint é marcado como **público** na API (não exige `Authorization: Bearer`), mas **sem** `x-api-key` válida o pedido é recusado com **401 Unauthorized**.

---

## 1. Gerar a chave no console administrativo

1. Inicie sessão no **console administrativo** com um utilizador que tenha papel **`admin`** ou **`manager`** (e acesso ao contexto pretendido).
2. Selecione o **contexto** no seletor global do cabeçalho da aplicação (a chave será criada para esse contexto).
3. Abra a página **Chaves de API — export BI (sindrômico)**:
   - Caminho na aplicação: **`/admin/syndromic/bi-export-api-keys`**
   - No menu lateral, enquadra-se na área de classificação sindrômica / vigilância.
4. Clique em criar nova chave, indique um **nome** descritivo (ex.: “Power BI — painel semanal”) e confirme.
5. Na resposta, a aplicação mostra a **chave completa** no formato `publicId.secret`. **Copie e guarde em local seguro** (gestor de segredos, cofre do BI). **O segredo não volta a ser exibido**; em listagens só aparecem o nome, o identificador público e metadados (criação, último uso, revogação).
6. Para invalidar uma chave comprometida ou em desuso, use **Revogar** na mesma página.

:::caution Boas práticas de segurança

- Trate a chave como **credencial sensível** (equivalente a uma password com escopo de leitura de dados do contexto).
- Use **HTTPS** sempre que possível.
- Prefira **uma chave por integração** (nome distinto) para auditar uso e revogar sem afetar outros consumidores.

:::

---

## 2. Chamar o endpoint de export

### URL

```http
GET {API_BASE}/v1/syndromic-classification/reports/bi-export-scores
```

Substitua `{API_BASE}` pela origem do backend (ex.: `https://api.gds.proepi.org.br` em produção — ver [Ambientes](ambientes)).

### Cabeçalho obrigatório

| Cabeçalho | Valor |
|-----------|--------|
| `x-api-key` | Chave completa `publicId.secret` (copiada na criação) |

O servidor também aceita o nome `X-Api-Key` (variação de capitalização).

### Parâmetros de query

| Parâmetro | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `startDate` | Sim | Início do intervalo (ISO 8601 data, ex.: `2026-01-01`) |
| `endDate` | Sim | Fim do intervalo (ex.: `2026-01-31`). Deve ser ≥ `startDate` |
| `contextId` | Condicional | **Obrigatório na URL** se a chave **não** estiver vinculada a um contexto. Se a chave **tiver** contexto, pode omitir; se enviar, **tem de coincidir** com o da chave (caso contrário **403 Forbidden**) |
| `syndromeId` | Não | Filtra por síndrome |
| `reportId` | Não | Filtra por `report` específico |
| `processingStatus` | Não | `processed`, `skipped` ou `failed` |
| `isAboveThreshold` | Não | `true` / `false` — filtra por acima do limiar |
| `onlyLatest` | Não | Por omissão `true`: considera apenas a classificação mais recente por par report×síndrome quando aplicável |
| `h3Resolution` | Não | Resolução H3 da coluna `location_index` (0–15; padrão **8**) |
| `onlySymptoms` | Não | Se `true`: uma linha por **report**, com localização, demografia e **`sintomas_codigos`** (união dos sintomas); **sem** colunas de score por síndrome nessa linha |
| `topScore` | Não | Se `true`: uma linha por **report** com a síndrome de maior score acima do limiar (`sindrome_codigo` + `classificacao_positiva: true`). Reports sem nenhum score acima do limiar voltam com `sindrome_codigo: null` e `classificacao_positiva: false`. **Mutuamente exclusivo com `onlySymptoms`** |

### Exemplo com `curl`

```bash
curl -sS -G "https://api.gds.proepi.org.br/v1/syndromic-classification/reports/bi-export-scores" \
  --data-urlencode "startDate=2026-01-01" \
  --data-urlencode "endDate=2026-01-31" \
  -H "x-api-key: COLE_AQUI_publicId.secret"
```

---

## 3. Formato da resposta (resumo)

O corpo é um **objeto JSON** com, entre outros:

- `generated_at` — instante da geração (ISO 8601)
- `context_id`, `context_name`
- `location_schema` — `{ "type": "h3", "resolution": <número> }`
- `only_symptoms` — eco do modo `onlySymptoms`
- `top_score` — eco do modo `topScore`
- `totals` — agregados de **reports** do contexto/intervalo (independente de classificação):
  - `positive` / `negative`: total de reports `POSITIVE` / `NEGATIVE`
  - `by_day`: lista por dia civil em America/Sao_Paulo (`{ "date": "yyyy-MM-dd", "positive": n, "negative": n }`); só dias com pelo menos um report
- `items` — lista de objetos; o conjunto de campos por linha depende dos modos `only_symptoms` / `top_score` (ver contrato na documentação Swagger do backend)

### Identificadores pseudonimizados (`usuario_ref` / `participacao_ref`)

Cada linha de `items` traz dois campos derivados, pensados para permitir métricas por pessoa **sem expor IDs internos**:

| Campo | Descrição |
|-------|-----------|
| `usuario_ref` | Pseudônimo estável do usuário **dentro deste contexto** (mesmo usuário em outro contexto recebe outro `usuario_ref`). |
| `participacao_ref` | Pseudônimo estável da participação do usuário no contexto. |

Propriedades garantidas:

- **Determinístico**: a mesma pessoa no mesmo contexto gera sempre o mesmo `usuario_ref` durante a vida útil da chave HMAC do servidor. Permite `COUNT(DISTINCT usuario_ref)` por dia para contar **pessoas distintas** em vez de **notificações**.
- **Pseudonimizado**: o servidor calcula via `HMAC-SHA256(chave, "{contextId}:u:{userId}")` → base64url (22 caracteres). Quem consome o export **não** consegue reverter para o `user_id` real sem a chave do servidor.
- **Rotação**: trocar a chave HMAC no servidor **invalida o histórico** de pseudônimos (mesma pessoa passa a ter outro `usuario_ref`). Planeje a rotação junto com o consumidor de BI.

:::caution LGPD
O `usuario_ref` ainda é **dado pessoal pseudonimizado**, não anônimo: o servidor pode reverter (tem a chave). Trate-o como informação sensível, especialmente em populações pequenas combinadas com sintomas, dia e `location_index` em resolução alta — que podem **reidentificar** indivíduos. Documente a finalidade no RIPD/DPIA e inclua cláusulas de uso no contrato com o consumidor.
:::

Em caso de erro, a API devolve o código HTTP habitual (**400** validação, **401** chave inválida/ausente, **403** `contextId` incompatível com a chave, **404** contexto inexistente) com mensagem no corpo quando aplicável.

---

## 4. Gestão programática das chaves (opcional)

Para automação interna (não expor em BI de terceiros), utilizadores **admin** ou **manager** podem usar a API autenticada com **JWT** (`Authorization: Bearer`):

| Método | Rota | Função |
|--------|------|--------|
| `GET` | `/v1/syndromic-classification/bi-export-api-keys?contextId={id}` | Listar chaves do contexto |
| `POST` | `/v1/syndromic-classification/bi-export-api-keys` | Corpo JSON: `{ "contextId": number, "name": string }` — resposta inclui `apiKey` completa **só nesta resposta** |
| `DELETE` | `/v1/syndromic-classification/bi-export-api-keys/{publicId}` | Revogar por identificador público (UUID) |

O utilizador tem de ter permissão de gestão sobre o **contexto** indicado.

---

## 5. Dashboards Metabase (complementar)

Para painéis internos que consultam o PostgreSQL diretamente, a migração **`V41__bi_materialized_views.sql`** define:

| View (`bi_export`) | Uso |
|--------------------|-----|
| `mv_participacao` | Participações ativas no contexto UNB |
| `mv_quiz_dados` | Submissões de quiz (contexto UNB) |
| `mv_reportes` | Reportes linha a linha (contexto UNB) |
| `mv_reportes_semanal` | Presença semanal agregada por participação (UNB) |

Estas views são **independentes** do endpoint `bi-export-scores` acima. Planeje `REFRESH MATERIALIZED VIEW CONCURRENTLY bi_export.mv_*` na rotina de BI.

---

**Última atualização**: Junho 2026
