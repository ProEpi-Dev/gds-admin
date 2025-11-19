# GitHub Actions Workflows

Este diretório contém os workflows de CI/CD do projeto.

## 📁 Workflow Disponível

### `deploy.yml` - Build and Deploy 🚀

Workflow completo com detecção de mudanças, build condicional e deploy automático.

**Funcionalidades:**
- ✅ Detecção inteligente de mudanças
- ✅ Build condicional (economiza ~40-50% do tempo)
- ✅ Execução automática de migrations
- ✅ Deploy automático no Kubernetes
- ✅ Sumários detalhados e logs organizados

**Execução:**
- Push para `main` → Build + Deploy automático
- Push para `develop` → Build sem deploy
- Pull Request → Build sem push de imagens
- Manual → workflow_dispatch disponível

## 🎯 Exemplos de Uso

### Cenário 1: Alteração Apenas no Backend

```bash
# Fez mudanças apenas em backend/
git add backend/
git commit -m "feat: add new endpoint"
git push origin main
```

**Resultado:**
- ✅ Detecta mudança no backend
- ⏭️ Pula build do frontend
- 🏗️ Builda apenas backend
- 🗄️ Executa migrations
- 🚀 Restart apenas do deployment backend
- ⏱️ Tempo economizado: ~50%

### Cenário 2: Alteração Apenas no Frontend

```bash
# Fez mudanças apenas em frontend/
git add frontend/
git commit -m "feat: update UI component"
git push origin main
```

**Resultado:**
- ⏭️ Pula build do backend
- ✅ Detecta mudança no frontend
- 🏗️ Builda apenas frontend
- ⏭️ Pula migrations
- 🚀 Restart apenas do deployment frontend
- ⏱️ Tempo economizado: ~50%

### Cenário 3: Alteração em Ambos

```bash
# Fez mudanças em ambos
git add backend/ frontend/
git commit -m "feat: new feature with API + UI"
git push origin main
```

**Resultado:**
- ✅ Detecta mudanças em ambos
- 🏗️ Builda backend e frontend
- 🗄️ Executa migrations
- 🚀 Restart de ambos deployments
- ⏱️ Build completo necessário

### Cenário 4: Apenas Documentação

```bash
# Alterou apenas README
git add README.md
git commit -m "docs: update documentation"
git push origin main
```

**Resultado:**
- ⏭️ Workflow não é executado (paths-ignore)
- ⏱️ Economia total de recursos

### Cenário 5: Pull Request

```bash
# Criou um PR para main
git push origin feature/nova-funcionalidade
# Abre PR no GitHub
```

**Resultado:**
- ✅ Detecta mudanças
- 🏗️ Builda os serviços alterados
- ⏭️ Não faz push de imagens (teste apenas)
- ⏭️ Não faz deploy
- ✅ Feedback rápido no PR

### Cenário 6: Deploy Manual

```bash
# No GitHub:
# Actions → Build and Deploy → Run workflow
```

**Resultado:**
- 🏗️ Builda ambos os serviços
- 📦 Publica novas imagens
- 🚀 Deploy no Kubernetes
- ✅ Útil para redeploy forçado

## 🔐 Configuração de Secrets

### KUBE_CONFIG (Obrigatório para Deploy)

```bash
# 1. Obter kubeconfig (método depende do seu cluster)
cat ~/.kube/config | base64 -w 0

# 2. Adicionar ao GitHub
# Repository → Settings → Secrets and variables → Actions
# New repository secret:
#   Name: KUBE_CONFIG
#   Value: [cole o base64 aqui]
```

**Teste se está funcionando:**
1. Faça uma mudança em `backend/` ou `frontend/`
2. Commit e push para `main`
3. Acompanhe em Actions tab
4. Verifique se o deploy foi executado

## 📊 Monitoramento

### GitHub Actions UI

Cada execução mostra:
- 📊 **Summary:** Resumo executivo com emojis
- 🔍 **Changes:** O que foi detectado
- 🏗️ **Builds:** Status de cada build
- 🚀 **Deploy:** Status do deployment
- 📋 **Logs:** Logs detalhados de cada step

### Exemplo de Summary

```markdown
## 🚀 Deployment Summary

### 📊 Changes Detected
- **Backend:** ✅ Changed
- **Frontend:** ⏭️ No changes

### 🏗️ Build Status
- **Backend Build:** ✅ Success
- **Frontend Build:** ⏭️ Skipped

### 🚀 Deployment Status
- **Deploy:** ✅ Success

### ✅ Deployment Successful!
Your changes have been deployed to the Kubernetes cluster.
```

## 🐛 Troubleshooting

### Build Falha

**Problema:** Build do backend/frontend falha
**Solução:**
1. Verifique os logs do build no GitHub Actions
2. Teste o build localmente: `docker build -t test ./backend`
3. Corrija os erros e faça novo commit

### Deploy Não Executa

**Problema:** Deploy é sempre pulado
**Verificar:**
1. Secret `KUBE_CONFIG` está configurado?
2. Branch é `main`?
3. É um push (não PR)?

### Migrations Falham

**Problema:** Job de migration falha
**Solução:**
1. Verifique logs: `kubectl logs -l job-name=database-migration -n gds`
2. Verifique conexão com banco: ConfigMap e Secrets
3. Teste migrations localmente primeiro

### Detecção de Mudanças Incorreta

**Problema:** Não detecta mudanças ou detecta incorretamente
**Causas possíveis:**
- Commit inicial do repositório (não há commit anterior)
- Push forçado (git push --force)
- Branch órfã

**Solução:**
- Use workflow_dispatch para forçar build manual

## 📈 Métricas de Performance

Tempo médio de execução (aproximado):

| Cenário | Build | Deploy | Total |
|---------|-------|--------|-------|
| Apenas Backend | ~3-5 min | ~2 min | ~5-7 min |
| Apenas Frontend | ~2-3 min | ~1 min | ~3-4 min |
| Ambos | ~5-7 min | ~3 min | ~8-10 min |
| Nenhum (docs only) | ~0 min | ~0 min | ~0 min |

Economia vs Build Sempre:
- Backend only: **~40% mais rápido**
- Frontend only: **~50% mais rápido**
- Docs only: **~100% mais rápido** (não executa)

## 🎓 Melhores Práticas

1. **Commits Atômicos:** Separe mudanças de backend e frontend quando possível
2. **Teste Local:** Sempre teste builds localmente antes de push
3. **Branch Develop:** Use para testes antes de merge para main
4. **Migrations:** Teste migrations em ambiente local/dev primeiro
5. **Rollback:** Se algo der errado, use git revert e push
6. **Monitoring:** Acompanhe os logs do deploy no Kubernetes

## 🔄 Workflow de Desenvolvimento Recomendado

```bash
# 1. Criar branch de feature
git checkout -b feature/minha-funcionalidade

# 2. Desenvolver e testar localmente
# ... código ...
docker build -t test ./backend
docker build -t test ./frontend

# 3. Commit e push para feature branch
git add .
git commit -m "feat: add new feature"
git push origin feature/minha-funcionalidade

# 4. Abrir PR para develop
# GitHub UI: Create Pull Request → base: develop

# 5. CI roda automaticamente (build sem deploy)
# Aguardar aprovação e merge

# 6. Merge PR para develop
# GitHub UI: Merge Pull Request

# 7. CI roda em develop (build sem deploy)
# Testar em ambiente de dev

# 8. Abrir PR de develop para main
# GitHub UI: Create Pull Request → base: main

# 9. Merge para main
# GitHub UI: Merge Pull Request

# 10. Deploy automático em produção! 🚀
# CI roda: build + deploy
```

## 📚 Recursos Adicionais

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [kubectl Docs](https://kubernetes.io/docs/reference/kubectl/)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

