# Vigilância Baseada em Eventos

## 🚀 Desenvolvimento Local

Este guia descreve como configurar e executar o projeto localmente para desenvolvimento.

### Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Docker** e **Docker Compose** (para o banco de dados)
- **Node.js** (versão 18 ou superior recomendada)
- **Yarn** (gerenciador de pacotes)
- **PostgreSQL Client** (opcional, para verificar o banco - pgAdmin, DBeaver, etc.)

### Passo a Passo

#### 1. Subir o Banco de Dados com Docker

Primeiro, precisamos subir o banco de dados PostgreSQL usando Docker:

```bash
cd gds-docker-local-dev
docker compose up -d
```

**Credenciais padrão do banco:**
- **Usuário:** `gds_user`
- **Senha:** `gds_password`
- **Database:** `gds_db`
- **Porta:** `5432`
- **Host:** `localhost`

O container será iniciado em background. Para verificar se está rodando:

```bash
docker ps
```

#### 2. Executar as Migrations

Agora vamos executar as migrations do banco de dados usando Flyway:

```bash
cd migrations
```

**Copiar o arquivo de configuração:**

```bash
# Linux/Mac
cp .env.example .env

# Windows
copy .env.example .env
```

**Executar as migrations:**

```bash
# Linux/Mac
docker compose up

# Windows
# Use o Docker Desktop ou PowerShell para executar:
docker compose up
```

As migrations serão executadas automaticamente. Aguarde a conclusão e verifique se não houve erros.

**Variáveis de ambiente padrão (já configuradas no .env.example):**
- `POSTGRES_DB=gds_db`
- `POSTGRES_USER=gds_user`
- `POSTGRES_PASSWORD=gds_password`
- `FLYWAY_BASELINE_ON_MIGRATE=true`
- `FLYWAY_BASELINE_VERSION=0`

#### 3. Verificar as Tabelas (Opcional)

Você pode verificar se as tabelas foram criadas corretamente usando um cliente PostgreSQL:

**Com pgAdmin ou DBeaver:**
- **Host:** `localhost`
- **Porta:** `5432`
- **Database:** `gds_db`
- **Usuário:** `gds_user`
- **Senha:** `gds_password`

#### 4. Configurar e Iniciar o Backend

Agora vamos configurar o backend:

```bash
cd backend
```

**Criar o arquivo de configuração:**

```bash
# Linux/Mac
cp .env.example .env

# Windows
copy .env.example .env
```

O arquivo `.env` já está configurado com as credenciais padrão do banco.

**Instalar as dependências:**

```bash
yarn install
```

**Gerar o cliente Prisma:**

```bash
yarn prisma generate
```

**Iniciar o servidor em modo desenvolvimento:**

```bash
yarn start:dev
```

O backend estará disponível em:
- **API:** `http://localhost:3000`
- **Swagger/API Docs:** `http://localhost:3000/api`

Verifique se o servidor está rodando corretamente acessando `http://localhost:3000/api` no navegador.

#### 5. Configurar e Iniciar o Frontend

Em um novo terminal, configure o frontend:

```bash
cd frontend
```

**Instalar as dependências:**

```bash
yarn install
```

**Iniciar o servidor de desenvolvimento:**

```bash
yarn dev
```

O frontend estará disponível em:
- **URL:** `http://localhost:5173`

#### 6. Configuração Inicial do Sistema

Após iniciar o backend e o frontend, é necessário fazer o setup inicial do sistema:

1. Acesse o endpoint de setup: `http://localhost:3000/v1/setup`
   - Este endpoint cria o primeiro usuário administrador e o primeiro contexto do sistema
   - Você pode acessar via Swagger em `http://localhost:3000/api` e executar o endpoint `/v1/setup` de lá
   - Ou fazer uma requisição POST diretamente para `http://localhost:3000/v1/setup`

2. Após executar o setup, use as credenciais padrão para acessar o frontend:
   - **Email:** `admin@example.com`
   - **Senha:** `admin123`

### Resumo das URLs

- **Backend API:** `http://localhost:3000`
- **Swagger/API Docs:** `http://localhost:3000/api`
- **Frontend:** `http://localhost:5173`
- **PostgreSQL:** `localhost:5432`

### Troubleshooting

**Problema: Porta já em uso**
- Se a porta 5432 estiver em uso, você pode alterar a porta do PostgreSQL no `docker-compose.yml` da pasta `gds-docker-local-dev`
- Lembre-se de atualizar a `DATABASE_URL` no `.env` do backend

**Problema: Erro de conexão com o banco**
- Verifique se o container do PostgreSQL está rodando: `docker ps`
- Verifique se as credenciais no `.env` do backend correspondem às do `docker-compose.yml`

**Problema: Migrations não executam**
- Verifique se o arquivo `.env` foi criado na pasta `migrations`
- Verifique se o PostgreSQL está acessível antes de executar as migrations

---

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
- Backend: `ghcr.io/proepi-dev/gds-admin/backend:<tag>`
- Frontend: `ghcr.io/proepi-dev/gds-admin/frontend:<tag>`

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
docker build -t ghcr.io/proepi-dev/gds-admin/backend:latest .

# Tag adicional (opcional - para versões específicas)
docker tag ghcr.io/proepi-dev/gds-admin/backend:latest ghcr.io/proepi-dev/gds-admin/backend:v1.0.0
```

##### Frontend

```bash
cd frontend

# Build da imagem (o Vite usará o arquivo .env.production)
docker build -t ghcr.io/proepi-dev/gds-admin/frontend:latest .

# Tag adicional (opcional - para versões específicas)
docker tag ghcr.io/proepi-dev/gds-admin/frontend:latest ghcr.io/proepi-dev/gds-admin/frontend:v1.0.0
```

#### 3. Push das Imagens

##### Backend

```bash
# Push da tag latest
docker push ghcr.io/proepi-dev/gds-admin/backend:latest

# Push de versão específica (se criou tag)
docker push ghcr.io/proepi-dev/gds-admin/backend:v1.0.0
```

##### Frontend

```bash
# Push da tag latest
docker push ghcr.io/proepi-dev/gds-admin/frontend:latest

# Push de versão específica (se criou tag)
docker push ghcr.io/proepi-dev/gds-admin/frontend:v1.0.0
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
- GitHub: `https://github.com/proepi-dev/gds-admin/pkgs/container/backend`
- GitHub: `https://github.com/proepi-dev/gds-admin/pkgs/container/frontend`

### Pull das Imagens Publicadas

```bash
# Backend
docker pull ghcr.io/proepi-dev/gds-admin/backend:latest

# Frontend
docker pull ghcr.io/proepi-dev/gds-admin/frontend:latest
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
ghcr.io/proepi-dev/gds-admin/backend:latest
ghcr.io/proepi-dev/gds-admin/backend:main
ghcr.io/proepi-dev/gds-admin/backend:20250119-1430
ghcr.io/proepi-dev/gds-admin/backend:main-abc1234
```

### 🔐 Configuração de Secrets

**IMPORTANTE:** O secret `KUBE_CONFIG` é **obrigatório** para o deploy funcionar.

**`KUBE_CONFIG`** (obrigatório)
```bash
# 1. Gere o kubeconfig em base64
cat ~/.kube/config | base64 -w 0

# 2. Adicione ao GitHub:
# Settings → Secrets and variables → Actions → New repository secret
# Nome: KUBE_CONFIG
# Valor: (conteúdo base64 do passo 1)
```

**⚠️ Sem o secret `KUBE_CONFIG`:**
- ✅ Build funciona normalmente
- ✅ Imagens são publicadas no GHCR
- ❌ Job de deploy falhará (esperado)

O workflow está configurado para executar deploy **apenas em `main`**, então você pode:
- Desenvolver na branch `develop` sem necessidade do secret
- Configurar o secret quando estiver pronto para deploy automático em produção

### Notas Importantes

- **Privacidade:** Por padrão, as imagens são privadas. Para torná-las públicas, vá em Package settings → Change visibility → Make public
- **Limpeza:** Imagens antigas podem ser deletadas através da interface do GitHub ou usando a API
- **Cache:** O Docker utiliza cache de camadas para acelerar builds subsequentes

---