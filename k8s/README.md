# gds Kubernetes Deployment

Este diretório contém os manifests Kubernetes para deploy da aplicação gds.

## Estrutura

- `namespace.yaml` - Namespace gds
- `secrets-production-example.yaml` - Secrets com dados sensíveis (senhas, chaves API)
- `configmaps.yaml` - Configurações não sensíveis
- `postgres-oltp-deployment.yaml` - Deployment do PostgreSQL OLTP (banco principal)
- `postgres-olap-deployment.yaml` - Deployment do PostgreSQL OLAP (banco analítico)
- `database-migration-job.yaml` - Job para executar migrações Flyway
- `backend-deployment.yaml` - Deployment do backend NestJS
- `frontend-deployment.yaml` - Deployment do frontend React
- `services.yaml` - Services para exposição dos pods
- `ingress.yaml` - Ingress com TLS para domínios
- `etl-cronjob.yaml` - CronJob para ETL
- `kustomization.yaml` - Configuração do Kustomize
- `sync-migrations.sh` - Script para sincronizar migrações

## Domínios Configurados

- **Frontend**: `gds.com`, `www.gds.com`
- **Backend API**: `api.gds.com`

## Bancos de Dados

A aplicação usa dois bancos PostgreSQL:

### PostgreSQL OLTP (Banco Principal)
- **Service**: `postgres-oltp:5432`
- **Uso**: Dados transacionais da aplicação
- **Prisma**: Usa a variável `DATABASE_URL`
- **Storage**: 10Gi PVC

### PostgreSQL OLAP (Banco Analítico)
- **Service**: `postgres-olap:5432`
- **Uso**: Dados para relatórios e análises
- **ETL**: Populado pelo processo ETL
- **Storage**: 10Gi PVC

## Migrações de Banco de Dados

O sistema usa **Flyway** para gerenciar migrações do banco de dados PostgreSQL.

### Como Funciona:

1. **Desenvolvimento**: Migrações ficam em `database/migrations/`
2. **Sincronização**: Script `sync-migrations.sh` copia para ConfigMap
3. **Execução**: Job do Kubernetes executa Flyway no banco

### Workflow de Migrações:

```bash
# 1. Criar nova migração (desenvolvimento)
echo "CREATE TABLE nova_tabela..." > database/migrations/V3__Nova_tabela.sql

# 2. Deploy completo (recomendado)
cd k8s
./deploy.sh

# OU manualmente:
# 2a. Aplicar bancos de dados
kubectl apply -f postgres-oltp-deployment.yaml
kubectl apply -f postgres-olap-deployment.yaml

# 2b. Aguardar bancos estarem prontos
kubectl wait --for=condition=available deployment/postgres-oltp -n gds --timeout=300s

# 2c. Sincronizar migrações
./sync-migrations.sh

# 2d. Executar migrações
kubectl apply -f database-migration-job.yaml

# 3. Verificar status
kubectl get jobs -n gds
kubectl logs job/database-migration -n gds
```

### Configuração do Flyway:

- **Imagem**: `flyway/flyway:9-alpine`
- **Configuração**: Via variáveis de ambiente
- **Migrações**: Carregadas via ConfigMap
- **Banco**: Conecta ao `postgres-oltp:5432`

### Comandos Úteis:

```bash
# Verificar status das migrações
kubectl logs job/database-migration -n gds

# Executar migrações manualmente
kubectl apply -f database-migration-job.yaml

# Sincronizar migrações
./sync-migrations.sh

# Verificar ConfigMap
kubectl get configmap database-migrations -n gds -o yaml
```

## Secrets Necessários

Os secrets contêm dados sensíveis codificados em base64. Para produção, você deve:

1. **Atualizar as senhas dos bancos de dados**
2. **Configurar a DATABASE_URL do Prisma**
3. **Configurar a chave real do SendGrid**
4. **Ajustar as URLs do Keycloak para produção**
5. **Configurar a URL do Loki para produção**
6. **Configurar as credenciais e endpoint do MinIO**

### Como atualizar secrets:

```bash
# Exemplo para atualizar senha do banco
kubectl create secret generic gds-secrets \
  --from-literal=DB_PASS=nova_senha_segura \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Imagens Docker

As imagens são hospedadas no GitHub Container Registry (privado):

- **Backend**: `ghcr.io/proepi-dev/gds-admin/backend:latest`
- **Frontend**: `ghcr.io/proepi-dev/gds-admin/frontend:latest`
- **ETL**: `ghcr.io/proepi-dev/gds-admin/etl:latest`

### Build e Push das Imagens

```bash
# Build e push de todas as imagens
./scripts/build-and-push-images.sh

# Build e push com versão específica
./scripts/build-and-push-images.sh v1.0.0

# Verificar tamanho do contexto Docker
./scripts/check-docker-context.sh
```

**Otimização de Contexto:**
- Cada serviço tem `.dockerignore` para reduzir o contexto
- `node_modules/`, `dist/`, logs e arquivos temporários são ignorados
- Contexto otimizado para builds mais rápidos

**Package Manager:**
- **Backend/Frontend**: Usa `yarn` (consistente com `yarn.lock`)
- **ETL**: Usa `pip` (Python)

### Configuração do Frontend

O frontend utiliza Vite. Durante o build, qualquer variável que comece com `VITE_` é injetada em `import.meta.env`. Atualmente usamos apenas:

- **VITE_API_BASE_URL**: URL da API backend.

Como o resultado do build é estático, mudanças nessas variáveis exigem um novo `docker build` da imagem do frontend.

## Componentes Disponíveis

Os manifests presentes neste diretório cobrem:

- Namespace `gds`
- PostgreSQL OLTP
- ConfigMap com migrações SQL (gerado a partir da pasta `migrations/sql`)
- Backend NestJS
- Frontend Vite
- Services e Ingress (Traefik)

Componentes presentes em projetos anteriores (Keycloak, MinIO, Loki, ETL, etc.) foram removidos para refletir o escopo atual.

### Configurar Secret do GitHub Container Registry

Como as imagens no GHCR são privadas, é necessário criar um secret no Kubernetes para autenticação.

**Opção 1: Copiar de outro namespace (Mais rápido se já existe)**

Se você já tem o secret em outro namespace (ex: `epially`):

```bash
cd k8s
./setup-ghcr-secret.sh copy epially
```

Isso copia o secret `ghcr-secret` do namespace `epially` para o namespace `gds`.

**Opção 2: Usando o script (Recomendado para criar novo)**

```bash
cd k8s
./setup-ghcr-secret.sh
```

O script solicitará seu username e token do GitHub.

**Opção 3: Usando variáveis de ambiente**

```bash
export GITHUB_USERNAME=seu_username
export GITHUB_TOKEN=seu_token
cd k8s
./setup-ghcr-secret.sh
```

**Opção 4: Manualmente com kubectl**

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=SEU_USERNAME \
  --docker-password=SEU_TOKEN \
  --namespace=gds
```

**Opção 5: Copiar manualmente com kubectl**

```bash
# Exportar secret de outro namespace e aplicar no gds
kubectl get secret ghcr-secret -n epially -o yaml | \
  sed "s/namespace: epially/namespace: gds/" | \
  sed "/uid:/d" | \
  sed "/resourceVersion:/d" | \
  sed "/creationTimestamp:/d" | \
  kubectl apply -f -
```

**⚠️ Importante:**
- Você precisa de um **Personal Access Token (PAT)** do GitHub com permissão `read:packages`
- Crie o token em: https://github.com/settings/tokens
- O secret deve ser criado **antes** de aplicar os deployments
- O nome do secret (`ghcr-secret`) deve corresponder ao usado nos deployments

## Deploy

### Opção 1: Script Automatizado (Recomendado)

```bash
cd k8s
./deploy.sh
```

**Ordem de execução sugerida:**
1. **Criar secret do GHCR** (`./setup-ghcr-secret.sh`) - **OBRIGATÓRIO para imagens privadas**
2. Namespace e secrets (`secrets-production-example.yaml` serve como referência)
3. PostgreSQL OLTP (`postgres-oltp-deployment.yaml`)
4. Gerar ConfigMap de migrações (`sync-migrations.sh`)
5. Executar job de migração (`database-migration-job.yaml`)
6. Backend e Frontend
7. Services e Ingress

### Opção 2: Usando Kustomize

```bash
kubectl apply -k k8s/
```

**⚠️ Importante**: Com Kustomize, você precisa executar as migrações manualmente:

```bash
# Após aplicar com Kustomize
kubectl wait --for=condition=available deployment/postgres-oltp -n gds --timeout=300s
cd k8s && ./sync-migrations.sh
kubectl apply -f database-migration-job.yaml
kubectl wait --for=condition=complete job/database-migration -n gds --timeout=300s
```

### Opção 3: Deploy Manual (Não Recomendado)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets-production-example.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/postgres-oltp-deployment.yaml
kubectl apply -f k8s/postgres-olap-deployment.yaml
kubectl wait --for=condition=available deployment/postgres-oltp -n gds --timeout=300s
cd k8s && ./sync-migrations.sh
kubectl apply -f k8s/database-migration-job.yaml
kubectl wait --for=condition=complete job/database-migration -n gds --timeout=300s
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/etl-cronjob.yaml
```

## Verificação

```bash
# Verificar pods
kubectl get pods -n gds

# Verificar services
kubectl get svc -n gds

# Verificar ingress
kubectl get ingress -n gds

# Verificar logs do backend
kubectl logs -f deployment/gds-backend -n gds

# Verificar logs do frontend
kubectl logs -f deployment/gds-frontend -n gds
```

## Dependências Externas

Este deployment assume que você já tem:

1. **Traefik** configurado como ingress controller
2. **cert-manager** para certificados TLS automáticos
3. **PostgreSQL** (OLTP e OLAP) rodando em outros namespaces
4. **Keycloak** rodando em `https://keycloak.maolabs.com.br` (já configurado)
5. **Loki** rodando em `https://loki.maolabs.com.br` (já configurado)

## Recursos

- **Backend**: 1 replica, 256Mi-512Mi RAM, 250m-500m CPU
- **Frontend**: 1 replica, 64Mi-128Mi RAM, 50m-100m CPU
- **ETL**: CronJob a cada 6 horas, 128Mi-256Mi RAM, 100m-200m CPU

> **Nota**: Configurado para POC com 1 replica por serviço

## Monitoramento

Os deployments incluem:
- Health checks (liveness/readiness probes)
- Resource limits
- Logs estruturados para Loki

## Keycloak Integration

O sistema está configurado para autenticação com Keycloak:

- **URL**: `https://keycloak.maolabs.com.br`
- **Realm**: `gds`
- **JWKS URI**: `https://keycloak.maolabs.com.br/realms/gds/protocol/openid-connect/certs`
- **Issuer**: `https://keycloak.maolabs.com.br/realms/gds`
- **Audience**: `api`

### Verificar Keycloak

```bash
# Testar endpoint de JWKS
curl https://keycloak.maolabs.com.br/realms/gds/protocol/openid-connect/certs

# Testar endpoint de configuração
curl https://keycloak.maolabs.com.br/realms/gds/.well-known/openid_configuration
```

## Loki Integration

O sistema está configurado para enviar logs para o Loki:

- **URL**: `https://loki.maolabs.com.br`
- **API Key Backend**: `gds-api-key-eaf8822d-9b1b-4cf9-94de-6606d5f3b5e0`
- **API Key Grafana**: `grafana-api-key-f6ce3bde-07dc-4371-a565-bc39a84e52e8`

### Verificar Logs no Loki

```bash
# Verificar se os logs estão chegando
kubectl logs -f deployment/gds-backend -n gds

# Testar endpoint de health do logger
kubectl port-forward svc/gds-backend 3002:3002 -n gds
curl http://localhost:3002/health/logger
```
