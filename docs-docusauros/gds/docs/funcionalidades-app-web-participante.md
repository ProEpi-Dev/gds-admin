---
sidebar_position: 2
---

# Funcionalidades — área web do participante (`/app`)

Esta página resume **funcionalidades entregues na aplicação web React** voltadas ao **cidadão participante** (rotas sob `/app`, `/login`, etc.). Complementa o **aplicativo móvel**; a documentação detalhada de modelo de dados continua em [Arquitetura](/arquitetura/modelagem-banco-dados/modelo-banco-dados). As **opções configuráveis por contexto** (perfil obrigatório, e-mail, regras de reports, integrações) estão descritas em [Configuração de contexto e integrações](/arquitetura/configuracao-contexto-e-integracoes).

## Visão geral

- **Stack**: React, MUI, TanStack Query, React Router (`frontend/`).
- **Papéis**: utilizadores com participação de contexto acedem à área do app (ex.: `participant`), por oposição ao dashboard administrativo.

---

## Autenticação e cadastro

### Confirmação de e-mail (por contexto)

- Quando o contexto exige verificação, o utilizador só utiliza a conta após confirmar o e-mail (fluxo configurável; campos e regras alinhados à migração **`V31__user_email_verification.sql`** no repositório).
- **Rotas**:
  - `/verify-email` — confirmação com `?token=`, reenvio do link informando o e-mail.
  - `/email-verified` — após confirmação com sucesso, página intermédia com **link para a app na Google Play** e **acesso ao login web** (URL da loja centralizada em constantes no frontend, ex.: `GUARDIOES_PLAY_STORE_URL`).
- Tratamento de erro de token inválido/expirado: mensagem na própria página (alerta), formulário de reenvio; evita-se toast duplicado com a mesma mensagem.
- Identidade visual: **logo** `logo_gds.svg` alinhada às telas de login e cadastro.

### Cadastro público (`/signup`) e login (`/login`)

- Logo institucional no **cadastro** (mesmo padrão visual do login).
- Integração com documentos legais e contexto público, conforme regras do backend.

---

## Perfil do participante

### Completar vs editar perfil

- **`/app/complete-profile`** — conclusão obrigatória do perfil quando aplicável.
- **`/app/profile`** — edição do perfil.
- Os **requisitos de campos** (género, país, localização, identificador externo, telefone, etc.) vêm do contexto / configuração (**`V30__profile_require_context_configuration.sql`** e modelo `context_configuration`).
- **País opcional no contexto**: se só a localização for obrigatória, as duas telas listam localizações de forma coerente (evita país em branco e lista de cidades vazia após gravar só `location_id`).

---

## Início (`/app/inicio`) — vigilância participativa

- Alternância entre módulos (ex.: **meu estado** / **sinal de alerta da comunidade**) conforme módulos ativos no contexto.
- **Calendário “Seus sinais e frequência”** (sinal comunitário):
  - Células com **sinal positivo** (vermelho) e **sem ocorrência / nada ocorreu** (verde) com **texto branco** para contraste.
  - **Legenda** discreta (vermelho = sinal de alerta; verde = nada ocorreu).
- **Carregamento inicial em rede lenta**: a lista de **formulários de sinal** é obtida antes de mostrar o aviso “não encontramos formulário…” e de ativar os botões de ação; enquanto carrega, exibe-se estado explícito (“Carregando formulário…”) em vez de botões desativados que parecem erro.

---

## Aprendizagem (trilhas / ciclos)

- **Quiz** (ex.: trilha no ciclo): botão **Finalizar Quiz** com estado **a carregar** (spinner + texto) até concluir a submissão (`QuizRenderer`).
- **Conteúdo da trilha**: **Marcar como concluído** com o mesmo tipo de feedback de carregamento (`AppLearnContentPage`).

---

## Referências rápidas no repositório

| Tema | Onde olhar (indicativo) |
|------|-------------------------|
| Rotas do app | `frontend/src/routes/AppRoutes.tsx` |
| Home participante | `frontend/src/features/app/pages/AppHomePage.tsx` |
| Auth / verify-email | `frontend/src/features/auth/pages/` |
| Perfil | `frontend/src/features/app/pages/UserProfilePage.tsx`, `CompleteProfilePage.tsx` |
| Quiz participante | `frontend/src/components/quiz/QuizRenderer.tsx`, `TrackCycleQuizTakePage.tsx` |
| Migrações DB | `migrations/sql/V30__*.sql`, `V31__*.sql` |

---

**Última atualização**: documentação alinhada às entregas da área web do participante (2026).
