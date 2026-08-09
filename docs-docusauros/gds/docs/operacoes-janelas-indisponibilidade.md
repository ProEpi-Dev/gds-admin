---
sidebar_position: 9
title: Operações — janelas de indisponibilidade
description: Como agendar manutenção programada ou anunciar uma queda, os três modos de bloqueio, o contrato do 503 e o que permanece acessível durante a janela.
---

# Operações — janelas de indisponibilidade

Permite anunciar (e, se necessário, impor) uma **janela de indisponibilidade** a partir do console administrativo. O backend passa a responder **503** nos endpoints bloqueados, com mensagem customizada, e os clientes exibem essa mensagem em vez de um erro genérico.

Serve tanto para **manutenção programada** (migração de dados, congelar escrita durante uma correção) quanto para **anunciar uma queda** já em curso.

## Modos

O modo define o quanto a janela bloqueia. Escolher o mais fraco que resolve costuma ser o certo — `full` derruba o app inteiro.

| Modo | Bloqueia | Quando usar |
|------|----------|-------------|
| `banner` | Nada | Avisar com antecedência sobre uma janela futura, ou comunicar algo sem interromper o uso |
| `read_only` | Apenas mutações (`POST`, `PUT`, `PATCH`, `DELETE`) | Congelar escrita durante uma correção de dados, deixando a leitura funcionando |
| `full` | Tudo, exceto o allowlist | Migração que não tolera tráfego, ou queda já em curso |

`GET`, `HEAD` e `OPTIONS` passam em `read_only`.

## O que permanece acessível

Durante uma janela `full`, o bloqueio vale para **todos, inclusive administradores**. Isso é intencional: `full` existe para congelar o sistema, e abrir exceção por papel permitiria vários admins seguirem alterando dados durante a própria janela.

A única saída é uma lista fixa de endpoints, marcados com `@AllowDuringMaintenance()` no código — o mínimo para entrar e desligar a manutenção:

| Endpoint | Por quê |
|----------|---------|
| `POST /v1/auth/login`, `/auth/refresh`, `/auth/logout` | Sem login ninguém entra para desligar a janela |
| `GET /v1/users/me/role` | O console não monta a navegação sem saber o papel de quem entrou |
| `GET /v1/maintenance/current` | Estado da janela, consumido pelos clientes |
| `/v1/maintenance-windows` (CRUD) | A tela que desliga a manutenção |
| `GET /v1/health` | Health check |

:::caution Sem esses endpoints, o modo `full` tranca todo mundo do lado de fora

Ao acrescentar um endpoint ao allowlist, lembre que ele continuará respondendo **durante toda a janela**. O CRUD segue restrito a `admin` pelo `RolesGuard` — `@AllowDuringMaintenance()` isenta do bloqueio por janela, **não** da autorização.

:::

O Swagger UI (`/api`) não passa por guards do Nest, então continua acessível independentemente da janela.

## Console administrativo

Menu **Indisponibilidade** (visível apenas para `admin`), em `/maintenance-windows`.

- **Listagem** — filtros por modo e por situação. A coluna Status distingue `Em vigor`, `Agendada`, `Encerrada` e `Desativada`: `active` sozinho não diz se a janela está valendo agora.
- **Cadastro/edição** — modo, início, término opcional, e título/mensagem por idioma.
- **Encerrar uma janela** — edite e desmarque **Habilitada**. Preferível a excluir: o registro fica para auditoria.

Um **banner** aparece no topo do console sempre que houver janela em vigor, em qualquer modo — inclusive `banner`, em que nada falha e ele é a única indicação de que a janela existe.

### Datas e fuso

Os campos usam a **hora local do navegador** e são convertidos para UTC no envio. O banco grava `TIMESTAMPTZ`.

Deixar o **término em branco** significa indisponibilidade **sem previsão de retorno** — a janela permanece até ser desativada manualmente. É o caso típico de uma queda não programada.

### Idiomas

`Português` é obrigatório: é o *fallback* quando o `Accept-Language` do cliente não casa com nenhum idioma preenchido. Inglês e espanhol são opcionais.

## API

### `GET /v1/maintenance/current`

Público e liberado durante a manutenção. É o **único jeito de o cliente descobrir uma janela `banner`**, que por definição não faz nenhuma requisição falhar.

Textos já resolvidos por `Accept-Language`, com *fallback* para português.

```json
{
  "inMaintenance": true,
  "mode": "full",
  "title": "Manutenção programada",
  "message": "Voltamos às 6h.",
  "startsAt": "2026-08-10T02:00:00.000Z",
  "endsAt": "2026-08-10T06:00:00.000Z"
}
```

Fora de janela, `inMaintenance` é `false` e os demais campos são `null`.

### CRUD

| Aspecto | Detalhe |
|---------|---------|
| **Rotas** | `GET/POST /v1/maintenance-windows`, `GET/PATCH/DELETE /v1/maintenance-windows/{id}` |
| **Papel** | `admin` |
| **Cabeçalhos** | `Authorization: Bearer {token}`, `x-gds-channel: web` |
| **Auditoria** | `MAINTENANCE_WINDOW_CREATE`, `_UPDATE`, `_DELETE` em `admin_action_log` |

Corpo de criação:

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `mode` | Sim | `banner`, `read_only` ou `full` |
| `startsAt` | Sim | Início, ISO 8601 em UTC |
| `endsAt` | Não | Fim previsto. Omitir ou `null` = sem previsão de retorno |
| `title` | Sim | Objeto por idioma; `pt` obrigatório |
| `message` | Sim | Objeto por idioma; `pt` obrigatório |
| `active` | Não | Padrão `true`. Permite cadastrar desabilitada e ligar depois |

A resposta inclui `inEffect`, calculado pelo servidor: `true` quando a janela está habilitada **e** o instante atual está dentro do período. É essa a janela que o guard aplica.

Erros comuns: **400** para período invertido (`endsAt` anterior ou igual a `startsAt`) ou `pt` ausente; **404** para janela inexistente.

## Contrato do 503

Endpoints bloqueados respondem no envelope de erro padrão da API, com `error.code = MAINTENANCE`:

```json
{
  "error": {
    "code": "MAINTENANCE",
    "message": "Voltamos às 6h.",
    "maintenance": {
      "mode": "full",
      "title": "Manutenção programada",
      "startsAt": "2026-08-10T02:00:00.000Z",
      "endsAt": "2026-08-10T06:00:00.000Z"
    }
  }
}
```

Quando há fim previsto, acompanha o cabeçalho **`Retry-After`** com os segundos restantes.

:::tip O `code` é o que distingue os dois tipos de 503

Um 503 também aparece quando o backend está **fora do ar** e quem responde é o proxy — sem corpo JSON. O cliente deve tratar os dois casos: com `error.code = MAINTENANCE`, exibir a mensagem do backend; sem ele, cair num texto genérico de indisponibilidade.

:::

## Comportamento interno

**Cache.** A janela vigente é consultada a cada requisição, então fica em cache por **15s**. O atraso é aceitável porque janelas são operadas com antecedência, não em tempo real. Alterações pelo CRUD **invalidam o cache na hora** — não é preciso esperar o TTL. O cache nunca se estende além de `endsAt`, para o bloqueio não sobreviver ao horário anunciado.

**Janelas sobrepostas.** Vence a mais restritiva (`full` > `read_only` > `banner`); empatando, a que começou antes.

**Falha aberto.** Se a consulta à tabela falhar — banco fora, migração ainda não aplicada — o guard **libera a requisição** e registra `MAINTENANCE_LOOKUP_FAILED` no log. O papel do guard é bloquear durante janelas anunciadas, não virar um novo ponto único de falha. Nesse estado o resultado fica em cache por 5s, para não sobrecarregar um banco já em dificuldade.

## Modelo de dados

Tabela `maintenance_window` (migração `V42`):

| Coluna | Tipo | Observação |
|--------|------|------------|
| `mode` | `maintenance_mode_enum` | `banner`, `read_only`, `full` |
| `starts_at` | `TIMESTAMPTZ(6)` | |
| `ends_at` | `TIMESTAMPTZ(6)` nulo | Nulo = sem previsão de retorno |
| `title`, `message` | `JSONB` | Mapa por idioma; `CHECK` exige a chave `pt` |
| `active` | `boolean` | Habilitação; permite encerrar sem apagar |

`TIMESTAMPTZ` aqui difere do `TIMESTAMP` usado no restante do schema. É deliberado: esta tabela é comparada contra `now()` para decidir se a API inteira fica indisponível, e um erro de fuso seria silencioso — ou derrubaria o sistema fora da janela, ou deixaria de bloquear dentro dela.

Um `CHECK` também impede `ends_at <= starts_at`, que geraria uma janela que nunca dispara ou nunca termina.

## Aplicativo móvel

O app trata o 503 e exibe a tela de manutenção com a mensagem vinda do backend. Apenas o modo `full` bloqueia a navegação; `banner` e `read_only` mostram uma faixa no topo e deixam o app seguir.

O app também re-consulta periodicamente e ao voltar do segundo plano, então **sai da tela de manutenção sozinho** quando a janela termina, sem precisar ser reiniciado.
