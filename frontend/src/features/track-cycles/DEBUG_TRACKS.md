# Debug: Fluxo de Dados das Trilhas

## Problema Original
O dropdown de trilhas não estava sendo preenchido após selecionar um contexto.

## Causa
Estava acessando `tracksData?.data` quando `tracksData` já era o array de trilhas.

## Fluxo Correto

### 1. Backend
```typescript
// track.service.ts - linha 133
return this.prisma.track.findMany({ ... });
// Retorna: Track[]
```

### 2. HTTP Response (Axios)
```typescript
// Axios envolve a resposta
{
  data: Track[],  // <- Array de trilhas aqui
  status: 200,
  ...
}
```

### 3. Frontend Service
```typescript
// track.service.ts
TrackService.list({ contextId: 1 })
// Retorna Promise<AxiosResponse<Track[]>>
```

### 4. Hook useTracks
```typescript
// useTracks.ts - linha 8-9
const response = await TrackService.list(...);
return response.data;  // <- Extrai o array: Track[]
```

### 5. Componente
```typescript
// TrackCycleFormPage.tsx
const { data: tracksData } = useTracks(contextId);
// tracksData é Track[], não { data: Track[] }

// ❌ ERRADO:
const tracks = tracksData?.data || [];

// ✅ CORRETO:
const tracks = tracksData || [];
```

## Correção Aplicada
- Linha 150: `const tracks = tracksData || [];`
- Adicionado log de debug para verificar dados carregados
- Melhorado `noOptionsText` para mostrar estado de carregamento

## Teste
1. Selecione um contexto
2. Verifique no console: "📚 Trilhas carregadas para contexto X"
3. O dropdown deve mostrar as trilhas disponíveis

## Remover depois
Após confirmar que está funcionando, remova:
- Este arquivo (`DEBUG_TRACKS.md`)
- O `useEffect` de debug (linhas 88-92 do TrackCycleFormPage.tsx)
