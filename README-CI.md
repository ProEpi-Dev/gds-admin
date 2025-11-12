# CI/CD - GitHub Actions

Este projeto utiliza GitHub Actions para buildar e publicar imagens Docker no GitHub Container Registry (ghcr.io).

## Workflow

O workflow `build-and-push.yml` é acionado automaticamente quando:

- Push para branches `main` ou `develop`
- Push de tags que começam com `v` (ex: `v1.0.0`)
- Pull requests para `main` ou `develop` (apenas build, sem push)

## Imagens Docker

As imagens são publicadas no GitHub Container Registry com os seguintes nomes:

- Backend: `ghcr.io/<seu-usuario>/<seu-repo>/backend`
- Frontend: `ghcr.io/<seu-usuario>/<seu-repo>/frontend`

## Tags

As imagens são taggeadas automaticamente com:

- `latest` - apenas para a branch padrão (main)
- `<branch-name>` - nome da branch
- `<branch-name>-<sha>` - branch + commit SHA
- `v<version>` - tags de versão (ex: v1.0.0)
- `v<major>.<minor>` - tags de versão menor (ex: v1.0)

## Como usar as imagens

### Pull das imagens

```bash
# Backend
docker pull ghcr.io/<seu-usuario>/<seu-repo>/backend:latest

# Frontend
docker pull ghcr.io/<seu-usuario>/<seu-repo>/frontend:latest
```

### Autenticação

Para fazer pull de imagens privadas, você precisa autenticar:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u <seu-usuario> --password-stdin
```

Ou criar um Personal Access Token (PAT) com permissão `read:packages` e usar:

```bash
docker login ghcr.io -u <seu-usuario> -p <seu-token>
```

## Variáveis de Ambiente

### Backend

O backend precisa das seguintes variáveis de ambiente:

- `DATABASE_URL` - URL de conexão com o banco de dados PostgreSQL
- `JWT_SECRET` - Secret para assinatura de tokens JWT
- `PORT` - Porta do servidor (padrão: 3000)

### Frontend

O frontend é uma aplicação estática servida pelo nginx e não precisa de variáveis de ambiente no runtime. As variáveis de ambiente de build devem ser configuradas no workflow se necessário.

## Executando localmente

### Backend

```bash
cd backend
docker build -t gds-backend .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  -e JWT_SECRET="your-secret" \
  gds-backend
```

### Frontend

```bash
cd frontend
docker build -t gds-frontend .
docker run -p 80:80 gds-frontend
```

## Cache

O workflow utiliza GitHub Actions Cache para acelerar builds subsequentes, armazenando as camadas do Docker build cache.

## Permissões

O workflow requer as seguintes permissões:

- `contents: read` - para fazer checkout do código
- `packages: write` - para publicar imagens no GitHub Container Registry

Essas permissões são configuradas automaticamente pelo GitHub Actions quando o workflow usa `GITHUB_TOKEN`.

