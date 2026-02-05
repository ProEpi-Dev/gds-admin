# Trilhas obrigatórias – API para o aplicativo móvel

Este documento descreve os endpoints e o fluxo para implementar no app móvel a lógica de **trilhas obrigatórias** por ciclo: como saber quais trilhas são obrigatórias no contexto do usuário e se ele já as concluiu.

## Modelo

- **Ciclos de trilha** (`track_cycle`) podem ter um campo opcional **`mandatory_slug`** (string única em todo o sistema).
- Quando um ciclo tem `mandatory_slug` preenchido, ele conta como uma “trilha obrigatória” identificada por aquele slug (ex.: `formacao-inicial`, `boas-vidas`).
- No **mesmo contexto** da participação do usuário, podem existir vários ciclos ativos; apenas os que têm `mandatory_slug` definido entram na lista de obrigatórios.
- O usuário está **em dia** para um dado slug quando existe pelo menos um **track_progress** com `status = completed` para a participação dele em **qualquer** ciclo (do mesmo contexto) que tenha esse `mandatory_slug`.

## Endpoints a usar no app

### 1. Conformidade de trilhas obrigatórias

**GET** `/v1/track-progress/mandatory-compliance?participationId={id}`

- **Autenticação:** Bearer JWT obrigatório.
- **Parâmetro:** `participationId` (obrigatório) – ID da participação do usuário logado (o mesmo retornado no login, ex.: `user.participation.id`).
- **Segurança:** Só é possível consultar a **própria** participação; caso contrário a API retorna 403.

**Resposta 200:**

```json
{
  "items": [
    {
      "mandatorySlug": "formacao-inicial",
      "label": "Trilha Formação – 2026.1",
      "completed": true,
      "trackCycleId": 5
    },
    {
      "mandatorySlug": "boas-vidas",
      "label": "Boas Práticas – 2026.1",
      "completed": false,
      "trackCycleId": 8
    }
  ],
  "totalRequired": 2,
  "completedCount": 1
}
```

- **items:** lista de obrigatórias do contexto (cada slug aparece no máximo uma vez).
- **mandatorySlug:** identificador único do tipo de trilha obrigatória.
- **label:** texto para exibição (nome da trilha + ciclo).
- **completed:** se o usuário já completou **algum** ciclo com esse slug no contexto.
- **trackCycleId:** ID de um ciclo ativo com esse slug (útil para redirecionar o usuário à trilha).
- **totalRequired:** total de slugs obrigatórios no contexto.
- **completedCount:** quantos desses o usuário já concluiu.

Se não houver trilhas obrigatórias no contexto, `items` virá vazio e `totalRequired` e `completedCount` serão 0.

### 2. Ciclos ativos do contexto

**GET** `/v1/track-cycles/active?contextId={contextId}`

- Lista ciclos ativos (status `active`, dentro do período) do contexto.
- Útil para listar ofertas de trilhas e permitir que o usuário **inicie** uma trilha obrigatória (ex.: usando o `trackCycleId` retornado em mandatory-compliance).

### 3. Iniciar progresso em um ciclo

**POST** `/v1/track-progress/start`

**Body:**

```json
{
  "participationId": 1,
  "trackCycleId": 5
}
```

- Cria o registro de progresso e sequências para aquele usuário naquele ciclo.
- A participação deve pertencer ao mesmo contexto do ciclo; caso contrário retorna 400.

### 4. Outros endpoints de progresso

- **GET** `/v1/track-progress/participation/{participationId}/cycle/{cycleId}` – progresso detalhado na trilha (sequências, bloqueios, etc.).
- Atualização de progresso de sequência, conclusão de conteúdo/quiz etc. conforme já utilizados pelo app.

## Fluxo sugerido no app

1. **Ao abrir o app (ou ao entrar no contexto):**
   - Obter `participationId` do usuário (ex.: do login ou perfil).
   - Chamar **GET** `/v1/track-progress/mandatory-compliance?participationId={id}`.

2. **Interpretar a resposta:**
   - Se `totalRequired === 0`: não há trilhas obrigatórias; fluxo normal.
   - Se existem itens com `completed === false`: o usuário ainda não cumpriu todas as obrigatórias. O app pode:
     - **Bloquear** o uso até concluir, ou
     - **Direcionar** o usuário para a trilha (usando `trackCycleId` ou `label`) antes de liberar outras funcionalidades.

3. **Quando o usuário conclui um ciclo:**
   - O backend atualiza o `track_progress` correspondente para `status: completed`.
   - Na próxima chamada a **mandatory-compliance**, os itens daquele `mandatory_slug` passarão a ter `completed: true`.

4. **Iniciar uma trilha obrigatória:**
   - Usar o `trackCycleId` retornado em mandatory-compliance (ou escolher um ciclo ativo com o mesmo slug via **GET** track-cycles/active).
   - Chamar **POST** `/v1/track-progress/start` com `participationId` e `trackCycleId`.

## Resumo

| Ação no app              | Endpoint                                                                 |
|--------------------------|--------------------------------------------------------------------------|
| Ver se está em dia       | GET `/v1/track-progress/mandatory-compliance?participationId={id}`       |
| Listar ciclos ativos     | GET `/v1/track-cycles/active?contextId={id}`                             |
| Iniciar uma trilha       | POST `/v1/track-progress/start` com `participationId` e `trackCycleId`   |
| Progresso na trilha      | GET `/v1/track-progress/participation/{pId}/cycle/{cId}`                 |

A tela **/app/welcome** do painel web usa o mesmo endpoint de mandatory-compliance para o admin validar se as regras de trilhas obrigatórias estão funcionando corretamente.
