# Alteração: Exclusão Permanente de Ciclos de Trilha

## Data: 30/01/2026

## Mudança Implementada

A exclusão de **ciclos de trilha** foi alterada de **soft delete** para **hard delete** (exclusão física do banco de dados).

---

## 🔴 ANTES (Soft Delete)

```typescript
// O registro era mantido no banco, apenas marcado como inativo
return this.prisma.track_cycle.update({
  where: { id },
  data: {
    active: false,
    updated_at: new Date(),
  },
});
```

**Problema**: Os registros ficavam acumulados no banco de dados, ocupando espaço desnecessário.

---

## ✅ AGORA (Hard Delete)

```typescript
// O registro é REMOVIDO PERMANENTEMENTE do banco de dados
return this.prisma.track_cycle.delete({
  where: { id },
});
```

**Benefício**: Banco de dados mais limpo e sem dados órfãos.

---

## 🛡️ Proteções Implementadas

### 1. Backend - Validação de Progresso

```typescript
// Verifica se há progresso associado ANTES de permitir exclusão
if (cycle.track_progress.length > 0) {
  throw new BadRequestException(
    `Não é possível deletar o ciclo pois existem ${cycle.track_progress.length} ` +
    `registros de progresso associados. Para prosseguir, primeiro remova ou migre ` +
    `os registros de progresso.`
  );
}
```

**Proteção**: Impossível deletar um ciclo que tenha alunos com progresso registrado.

### 2. Frontend - Dialog de Confirmação Claro

```
⚠️ Confirmar exclusão permanente

Tem certeza que deseja EXCLUIR PERMANENTEMENTE o ciclo "2026.1"?

⚠️ ATENÇÃO: Esta ação REMOVERÁ O REGISTRO DO BANCO DE DADOS de forma irreversível!

✓ Só é possível excluir se não houver nenhum progresso de alunos registrado.
✓ Caso existam registros de progresso, você precisará removê-los ou migrá-los primeiro.

[Cancelar]  [Confirmar]
```

**Proteção**: Usuário é alertado sobre a irreversibilidade da ação.

---

## 📋 Arquivos Modificados

### Backend
1. **`backend/src/track-cycles/track-cycles.service.ts`**
   - Linha 295-301: Mudado de `update()` para `delete()`
   - Melhorada mensagem de erro com instruções

2. **`backend/src/track-cycles/track-cycles.controller.ts`**
   - Linha 202-227: Atualizada documentação Swagger
   - Deixa claro que é "hard delete"

### Frontend
3. **`frontend/src/features/track-cycles/pages/TrackCyclesListPage.tsx`**
   - Linha 266-276: Dialog de confirmação mais explícito
   - Alerta visual com emojis ⚠️

---

## 🎯 Casos de Uso

### ✅ Cenário 1: Ciclo sem Progresso
```
Usuário: Deleta ciclo "2026.1" 
Sistema: ✓ Ciclo removido permanentemente do banco
```

### ❌ Cenário 2: Ciclo com Progresso
```
Usuário: Tenta deletar ciclo "2026.1" com 15 alunos
Sistema: ✗ Erro 400 - "Não é possível deletar o ciclo pois existem 
         15 registros de progresso associados. Para prosseguir, 
         primeiro remova ou migre os registros de progresso."
```

---

## 🔧 Comportamento das Constraints do Banco

A constraint `onDelete: Restrict` na tabela `track_progress` garante que:

```sql
-- Na migration V7__track_cycles_and_progress.sql
CONSTRAINT fk_track_progress_cycle 
  FOREIGN KEY (track_cycle_id) REFERENCES track_cycle(id) 
  ON DELETE RESTRICT
```

**Resultado**: Postgres impedirá a exclusão se houver FK ativas, mesmo que o código não validasse.

---

## ⚠️ Avisos Importantes

1. **Não há recuperação**: Uma vez deletado, o ciclo não pode ser restaurado
2. **Backups**: Recomenda-se manter backups regulares do banco de dados
3. **Logs**: A exclusão não fica registrada (considere adicionar audit log no futuro)
4. **Progressos**: Se precisar deletar um ciclo com progresso:
   - Opção 1: Migrar progressos para outro ciclo
   - Opção 2: Deletar os progressos primeiro (cuidado!)

---

## 📊 Impacto

- **Positivo**: Banco mais limpo, sem lixo digital
- **Risco**: Baixo (proteções em múltiplas camadas)
- **Reversibilidade**: Nenhuma (por design)

---

## 🧪 Testes Recomendados

1. ✅ Deletar ciclo sem progresso → Deve funcionar
2. ✅ Tentar deletar ciclo com progresso → Deve bloquear
3. ✅ Verificar mensagem de erro é clara
4. ✅ Confirmar que dialog é explícito
5. ✅ Validar que registro sumiu do banco de dados

---

## 📝 Notas Técnicas

- **Tipo de Delete**: `prisma.track_cycle.delete()` (hard delete)
- **Cascade**: Não há cascade para `track_progress` (Restrict)
- **Soft Delete**: Removido completamente
- **Campo `active`**: Ainda existe na tabela, mas não é usado na exclusão
