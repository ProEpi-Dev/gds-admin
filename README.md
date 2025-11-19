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

## Build Automatizado com GitHub Actions

O projeto está configurado para build automático através do GitHub Actions. As imagens são buildadas e publicadas automaticamente quando há push nas branches `main` ou `develop`.

### Como Funciona

1. **Trigger:** O workflow é executado em push para `main`, `develop` ou em pull requests
2. **Ambiente:** Usa o arquivo `frontend/.env.production` com a URL da API
3. **Publicação:** As imagens são publicadas automaticamente no GHCR (exceto em PRs)

### Arquivos de Configuração

O workflow utiliza o arquivo `.env.production` versionado no repositório:
- `frontend/.env.production` - URL da API (atualmente: `https://devapi.gds.proepi.org.br/v1`)

Para alterar a URL da API, edite esse arquivo e faça commit.

### Workflow

Localização: `.github/workflows/build-and-push.yml`

O workflow:
1. Faz checkout do código
2. Configura o ambiente apropriado (prod ou dev)
3. Builda as imagens Docker
4. Publica no GitHub Container Registry

### Tags das Imagens

As imagens são publicadas com múltiplas tags:
- `latest` - última versão da branch default (main)
- `main` - última versão da branch main
- `develop` - última versão da branch develop
- `<branch>-<sha>` - commit específico

### Notas Importantes

- **Privacidade:** Por padrão, as imagens são privadas. Para torná-las públicas, vá em Package settings → Change visibility → Make public
- **Limpeza:** Imagens antigas podem ser deletadas através da interface do GitHub ou usando a API
- **Cache:** O Docker utiliza cache de camadas para acelerar builds subsequentes

---