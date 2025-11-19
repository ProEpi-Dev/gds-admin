# Vigilância Baseada em Eventos

## Build e Publish Manual de Imagens Docker

Este projeto inclui Dockerfiles para buildar imagens Docker do backend e frontend. As imagens podem ser buildadas localmente ou publicadas manualmente no GitHub Container Registry.

### Pré-requisitos

- Docker instalado e rodando
- Acesso ao repositório GitHub (para publish)
- Personal Access Token (PAT) do GitHub com permissão `write:packages` (para publish)

### Build Local

#### Backend

```bash
cd backend
docker build -t gds-backend:local .
```

#### Frontend

O frontend usa o arquivo `.env.production` para configurar a URL da API durante o build:

**Build local padrão:**
```bash
cd frontend
# Usa o arquivo .env.production versionado (https://devapi.gds.proepi.org.br/v1)
docker build -t gds-frontend:local .
```

**Build com URL customizada:**
```bash
cd frontend
# Sobrescreve com URL customizada
echo "VITE_API_BASE_URL=https://sua-api.exemplo.com/v1" > .env.production
docker build -t gds-frontend:local .
```

### Testar Imagens Localmente

#### Backend

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e JWT_SECRET="your-secret" \
  gds-backend:local
```

#### Frontend

```bash
docker run -p 80:80 gds-frontend:local
```

### Publish Manual para GitHub Container Registry

As imagens serão publicadas com o seguinte formato:
- Backend: `ghcr.io/gleytonlima/gds/backend:<tag>`
- Frontend: `ghcr.io/gleytonlima/gds/frontend:<tag>`

#### 1. Autenticar no GitHub Container Registry

```bash
# Usando Personal Access Token (PAT)
echo $GITHUB_TOKEN | docker login ghcr.io -u GleytonLima --password-stdin

# Ou usando token diretamente
docker login ghcr.io -u GleytonLima -p <seu-token>
```

**Nota:** Crie um PAT em: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
- Permissões necessárias: `write:packages`, `read:packages`, `delete:packages`

#### 2. Build e Tag das Imagens

##### Backend

```bash
cd backend

# Build da imagem
docker build -t ghcr.io/gleytonlima/gds/backend:latest .

# Tag adicional (opcional - para versões específicas)
docker tag ghcr.io/gleytonlima/gds/backend:latest ghcr.io/gleytonlima/gds/backend:v1.0.0
```

##### Frontend

```bash
cd frontend

# Build da imagem (o Vite usará o arquivo .env.production)
docker build -t ghcr.io/gleytonlima/gds/frontend:latest .

# Tag adicional (opcional - para versões específicas)
docker tag ghcr.io/gleytonlima/gds/frontend:latest ghcr.io/gleytonlima/gds/frontend:v1.0.0
```

#### 3. Push das Imagens

##### Backend

```bash
# Push da tag latest
docker push ghcr.io/gleytonlima/gds/backend:latest

# Push de versão específica (se criou tag)
docker push ghcr.io/gleytonlima/gds/backend:v1.0.0
```

##### Frontend

```bash
# Push da tag latest
docker push ghcr.io/gleytonlima/gds/frontend:latest

# Push de versão específica (se criou tag)
docker push ghcr.io/gleytonlima/gds/frontend:v1.0.0
```

### Script Completo de Build e Publish

Você pode criar um script para automatizar o processo:

```bash
#!/bin/bash

# Configurações
REGISTRY="ghcr.io"
USERNAME="GleytonLima"
REPO="gds"
VERSION="${1:-latest}"

# Autenticar
echo "Autenticando no GitHub Container Registry..."
echo $GITHUB_TOKEN | docker login $REGISTRY -u $USERNAME --password-stdin

# Build e Push Backend
echo "Buildando backend..."
cd backend
docker build -t $REGISTRY/$USERNAME/$REPO/backend:$VERSION .
docker push $REGISTRY/$USERNAME/$REPO/backend:$VERSION
cd ..

# Build e Push Frontend
echo "Buildando frontend..."
cd frontend
docker build -t $REGISTRY/$USERNAME/$REPO/frontend:$VERSION .
docker push $REGISTRY/$USERNAME/$REPO/frontend:$VERSION
cd ..

echo "Build e publish concluídos!"
```

Uso do script:
```bash
chmod +x build-and-push.sh
export GITHUB_TOKEN="seu-token-aqui"
./build-and-push.sh latest
# ou para uma versão específica
./build-and-push.sh v1.0.0
```

### Verificar Imagens Publicadas

As imagens publicadas podem ser visualizadas em:
- GitHub: `https://github.com/GleytonLima/gds/pkgs/container/backend`
- GitHub: `https://github.com/GleytonLima/gds/pkgs/container/frontend`

### Pull das Imagens Publicadas

```bash
# Backend
docker pull ghcr.io/gleytonlima/gds/backend:latest

# Frontend
docker pull ghcr.io/gleytonlima/gds/frontend:latest
```

## CI/CD com GitHub Actions

O projeto está configurado com pipelines automatizados de build e deploy.

### 🔄 Workflow Principal: Build and Deploy

**Arquivo:** `.github/workflows/deploy.yml`

Este workflow detecta mudanças, builda apenas o necessário e faz deploy automático no Kubernetes.

#### Como Funciona

1. **🔍 Detecção de Mudanças**
   - Compara commits para detectar mudanças em `backend/` ou `frontend/`
   - Evita builds desnecessários, economizando tempo e recursos

2. **🏗️ Build Condicional**
   - **Backend:** Builda apenas se houver mudanças em `backend/`
   - **Frontend:** Builda apenas se houver mudanças em `frontend/`
   - Cada build gera múltiplas tags (latest, timestamp, branch, sha)

3. **🗄️ Database Migrations (Automático)**
   - Se o backend mudou, executa migrations automaticamente
   - Usa o job `k8s/database-migration-job.yaml`
   - Sincroniza migrations via `k8s/sync-migrations.sh`

4. **🚀 Deploy no Kubernetes**
   - Deploy apenas na branch `main` (produção)
   - Restart apenas dos deployments que mudaram
   - Aguarda rollout completo antes de finalizar
   - Mostra logs e status dos pods

5. **📢 Notificações**
   - Sumário detalhado no GitHub Actions
   - Status de cada etapa (changes, build, deploy)

#### Triggers

- ✅ Push para `main` ou `develop`
- ✅ Pull Requests para `main` ou `develop`
- ✅ Manual dispatch (workflow_dispatch)
- ⏭️ Ignora mudanças em `k8s/`, `README.md` e outros arquivos markdown

#### Configuração de Ambiente

**Frontend:** Usa o arquivo `.env.production` versionado
- Localização: `frontend/.env.production`
- URL atual: `https://devapi.gds.proepi.org.br/v1`

#### Tags das Imagens

Cada build gera múltiplas tags:
- `latest` - última versão da branch main
- `main` / `develop` - última versão da branch correspondente
- `<branch>-<sha>` - commit específico
- `YYYYMMDD-HHMM` - timestamp do build

Exemplo:
```
ghcr.io/gleytonlima/gds/backend:latest
ghcr.io/gleytonlima/gds/backend:main
ghcr.io/gleytonlima/gds/backend:20250119-1430
ghcr.io/gleytonlima/gds/backend:main-abc1234
```

### 🔐 Configuração de Secrets

Para habilitar o deploy automático no Kubernetes, configure o secret:

**`KUBE_CONFIG`** (obrigatório para deploy)
```bash
# 1. Gere o kubeconfig em base64
cat ~/.kube/config | base64 -w 0

# 2. Adicione ao GitHub:
# Settings → Secrets and variables → Actions → New repository secret
# Nome: KUBE_CONFIG
# Valor: (conteúdo base64 do passo 1)
```

**Sem o secret `KUBE_CONFIG`:**
- ✅ Build funciona normalmente
- ✅ Imagens são publicadas no GHCR
- ⏭️ Deploy é pulado automaticamente

### Notas Importantes

- **Privacidade:** Por padrão, as imagens são privadas. Para torná-las públicas, vá em Package settings → Change visibility → Make public
- **Limpeza:** Imagens antigas podem ser deletadas através da interface do GitHub ou usando a API
- **Cache:** O Docker utiliza cache de camadas para acelerar builds subsequentes

---