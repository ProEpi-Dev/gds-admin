---
sidebar_position: 0
---

# Configuração de contexto e integrações de reports

Este documento descreve **todas as opções configuráveis por contexto** no GDS: dados do próprio `context`, pares **chave/valor** em `context_configuration`, e a **configuração versionada de integração** (`integration_config`) usada para encaminhar sinais a sistemas externos.

Para o modelo relacional base, veja também [Contextos e Participação](modelagem-banco-dados/contextos-participacao).

---

## 1. Entidade `context`

| Campo / relação | Descrição |
|-----------------|-----------|
| `name`, `description`, `type` | Identificação e classificação livre do contexto |
| `location_id` | Localização associada (opcional) |
| `access_type` | `PUBLIC` — permite cadastro/listagem pública (ex.: signup); `PRIVATE` — apenas convite/administração |
| `active` | Contexto ativo ou desativado (soft delete operacional) |
| **`context_module`** | Módulos habilitados para participantes (ver enum abaixo) |

### Módulos (`context_module_code`)

| Código | Função resumida |
|--------|-----------------|
| `self_health` | Vigilância do próprio estado de saúde (ex.: humor BEM/MAL, mapa) |
| `community_signal` | Sinais de alerta comunitários (calendário de frequência, lista de sinais) |

Um contexto pode ter **vários módulos**; a UI do app escolhe o fluxo conforme a lista retornada na participação.

---

## 2. Tabela `context_configuration`

Armazena **pares (`context_id`, `key`) → `value` JSON**, um valor por chave por contexto. Chaves seguem o padrão `snake_case` (validação na API: `[a-z0-9_]{1,100}`).

A interface de administração lista e edita essas entradas (aba de configuração do contexto no frontend). Migrações iniciais: **`V28__context_configuration.sql`**, **`V30__profile_require_context_configuration.sql`**, **`V31__user_email_verification.sql`**.

### 2.1 Reports — janelas e anti-abuso

| Chave | Tipo esperado | Efeito |
|-------|----------------|--------|
| `negative_report_dedup_window_min` | Inteiro **> 0** (minutos) | Evita registos repetidos de “nada ocorreu” / negativo dentro da janela (deduplicação). Default típico: **60**. |
| `negative_block_if_positive_within_min` | Inteiro **> 0** (minutos) | Bloqueia novo report negativo (“nada ocorreu”) se existiu **sinal positivo** no mesmo utilizador dentro da janela. Default típico: **60**. |

**Consumidor principal:** serviço de reports (`ReportsService`), ao criar reports negativos/positivos.

### 2.2 Cadastro e autenticação

| Chave | Tipo esperado | Efeito |
|-------|----------------|--------|
| `allowed_email_domains` | **Array de strings** (domínios, sem `@`) | Lista de sufixos permitidos para e-mail no cadastro público; **`[]`** = sem restrição por domínio. |
| `social_sso_enabled` | Boolean | Liga/desliga fluxo de SSO social (quando suportado pelo produto). Default: **false**. |
| `require_email_verification` | Boolean | Se **true**, o utilizador deve confirmar o e-mail antes de sessão plena / regras de login. Default em migração: **false**. |

### 2.3 Perfil do participante (completude)

Cada chave define se o campo é **obrigatório** para considerar o perfil completo nesse contexto (valores booleanos em JSON):

| Chave | Significado |
|-------|-------------|
| `profile_require_gender` | Exige género |
| `profile_require_country` | Exige país (localização hierárquica) |
| `profile_require_location` | Exige localização (cidade/nível folha) |
| `profile_require_external_identifier` | Exige identificador externo (CPF, matrícula, etc.) |
| `profile_require_phone` | Exige telefone |

**Consumidor:** serviço de utilizadores / `profile-status` para o app web e fluxo “completar perfil”.

### 2.4 Chaves arbitrárias (JSON)

A API permite **outras chaves** alinhadas ao padrão de nome (não listadas acima): o valor é JSON genérico. Use com critério para extensões futuras; prefira documentar novas chaves aqui quando entrarem em produção.

---

## 3. Integração de reports (`integration_config`)

Tabela **separada** de `context_configuration`, dedicada ao **envio de reports** para um sistema externo (cliente HTTP, mapeamento de payload, autenticação).

### 3.1 Modelo resumido

| Campo | Descrição |
|-------|-----------|
| `context_id` | Contexto ao qual a configuração pertence |
| `version` | Numeração incremental por contexto (cada alteração relevante pode gerar nova versão) |
| `is_active` | Apenas uma configuração ativa por vez por contexto (as anteriores ficam inativas ao versionar) |
| `base_url_production` / `base_url_homologation` | URLs base do serviço externo |
| `auth_config` | JSON (tokens, cabeçalhos, OAuth, etc.) — estrutura definida pelo conector |
| `payload_mapping` | JSON com mapeamento do **envelope** do evento (nomes dos campos no payload) |
| `timeout_ms` | Timeout HTTP (ex.: 1000–120000 ms) |
| `max_retries` | Tentativas em falhas transitórias (ex.: 0–10) |

### 3.2 Mapeamento de envelope (API de upsert)

O backend combina o corpo `UpsertIntegrationConfigDto` com o `payload_mapping` existente. Campos típicos (todos opcionais no DTO; têm **defaults** no serviço se omitidos):

- `templateId` — identificador de modelo no sistema externo (ex.: `"/1"`).
- `templateFieldKey` — chave do campo de template no payload.
- Chaves de utilizador: `userIdFieldKey`, `userEmailFieldKey`, `userNameFieldKey`, `userPhoneFieldKey`, `userCountryFieldKey`.
- Chaves de origem do evento: `eventSourceIdFieldKey`, `eventSourceLocationFieldKey`, `eventSourceLocationIdFieldKey`.

Detalhes de negócio (Ephem, normalização de localização, etc.) estão em `ReportIntegrationsService` no repositório.

### 3.3 Endpoints (indicativo)

- **Configuração:** `PUT /report-integrations/config/:contextId` (papéis admin/manager) — corpo conforme `UpsertIntegrationConfigDto`.
- **Eventos / mensagens:** endpoints sob `/report-integrations/...` para consulta de fila de integração e troca de mensagens com o externo.

---

## 4. Onde editar na aplicação

| Área | Caminho típico (frontend) |
|------|---------------------------|
| Dados gerais e módulos do contexto | Gestão de contextos (admin) |
| `context_configuration` | Aba de **configuração** do contexto (`ContextConfigurationTab`) |
| Integração de reports | Área **integração / report integrations** por contexto (URLs, auth, mapeamento, timeouts) |

---

## 5. Referências no repositório

| Tema | Local |
|------|--------|
| Prisma `context`, `context_configuration`, `integration_config` | `backend/prisma/schema.prisma` |
| Validação de chaves `context_configuration` | `backend/src/contexts/contexts.service.ts` |
| Regras de janela negativa/positiva | `backend/src/reports/reports.service.ts` |
| Verificação de e-mail no login/signup | `backend/src/auth/auth.service.ts` |
| Upsert integração | `backend/src/report-integrations/report-integrations.service.ts`, `dto/upsert-integration-config.dto.ts` |

---

**Última atualização:** documentação alinhada ao modelo e às chaves conhecidas (2026).
