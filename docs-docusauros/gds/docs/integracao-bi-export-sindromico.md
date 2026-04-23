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
- `items` — lista de objetos; o conjunto de campos por linha depende de `only_symptoms` (ver contrato na documentação Swagger do backend ou na página de chaves no admin, onde há um exemplo de URL)

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

**Última atualização**: Abril 2026
