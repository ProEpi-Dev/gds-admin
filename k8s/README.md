# gds Kubernetes Deployment

Este diretório contém os manifests Kubernetes para deploy da aplicação gds.

## Visão Geral

- Namespace alvo: `gds`
- Banco principal: PostgreSQL OLTP (`postgres-oltp`)
- Aplicação: backend NestJS + frontend Vite
- Migrações: Flyway (`database-migration-job.yaml`)
- Backup S3: manifests opcionais `database-backup-s3-*`

### Fluxo recomendado (ambiente novo)

1. Validar pré-requisitos externos (ingress controller compatível, cert-manager, etc.)
2. Criar secret de autenticação do GHCR (`ghcr-secret`)
3. Preparar e aplicar `secrets-production-example.yaml` (com valores reais)
4. Aplicar manifests de base (`namespace`, `configmaps`, `postgres`)
5. Sincronizar migrações (`sync-migrations.sh`) e rodar o Job do Flyway
6. Subir backend/frontend + `services.yaml` + manifest de Ingress adequado ao controller (`ingress.yaml` para Traefik ou `ingress-nginx-example.yaml` para Ingress NGINX)
7. Validar estado com os comandos da secção **Verificação**

## Estrutura do Diretório

### Core do deploy

- `namespace.yaml` - Namespace `gds`
- `secrets-production-example.yaml` - Exemplo de secrets: `gds-secrets`, `mail-credentials`, `gds-frontend-secrets`
- `configmaps.yaml` - ConfigMap do backend (OpenTelemetry)
- `postgres-oltp-deployment.yaml` - Deployment + Service do PostgreSQL OLTP
- `database-migration-job.yaml` - Job de migração Flyway
- `backend-deployment.yaml` - Deployment do backend NestJS
- `frontend-deployment.yaml` - Deployment do frontend React/Vite
- `services.yaml` - Services da aplicação
- `ingress.yaml` - Ingress com anotações **Traefik** (TLS/domínios)
- `ingress-nginx-example.yaml` - Exemplo equivalente para **Ingress NGINX** (`ingressClassName: nginx`)

### Operações e utilitários

- `sync-migrations.sh` - Atualiza ConfigMap de migrações SQL
- `setup-ghcr-secret.sh` - Cria/copia secret `ghcr-secret`
- `deploy.sh` - Deploy automatizado (quando disponível no ambiente)
- `kustomization.yaml` - Configuração do Kustomize (quando presente)

### Backup (opcional)

- `database-backup-s3-secrets-example.yaml` - Secret `gds-db-backup-s3` (S3 + opcional Healthchecks)
- `database-backup-s3-job-example.yaml` - Backup pontual via Job
- `database-backup-s3-cronjob-example.yaml` - Backup agendado via CronJob

## Dependências Externas

Este deployment assume:

1. **Ingress controller** — **Traefik** ou **Ingress NGINX** (usa o manifest de Ingress que corresponde ao que está instalado no cluster; ver secção **Ingress (Traefik vs NGINX)**)
2. **cert-manager** para TLS automático
3. **PostgreSQL OLTP** no cluster (ou acessível à rede do pod, conforme `DATABASE_URL`)
4. **(Opcional)** OpenTelemetry Collector (ou SaaS OTLP) acessível no endpoint configurado

## Domínios Configurados

- Frontend: `gds.com`, `www.gds.com`
- API Backend: `api.gds.com`

## Ingress (Traefik vs NGINX)

O ficheiro **`ingress.yaml`** assume **Traefik**: anotações `traefik.ingress.kubernetes.io/*` e **sem** `ingressClassName`. Num cluster onde o controller activo é o **Ingress NGINX** (IngressClass `nginx`), esse manifest **não** é associado ao NGINX: o `kubectl get ingress -n gds` mostra **`CLASS` vazio** (`<none>`), **`ADDRESS` vazio** e o balanceador externo não encaminha tráfego. O **cert-manager** (HTTP-01) também pode falhar ou ficar inconsistente se o solver não usar a mesma classe.

O que fazer:

1. Confirmar o controller e a classe: `kubectl get pods -A | grep -E 'ingress-nginx|traefik'` e `kubectl get ingressclass`.
2. Se existir a classe **`nginx`**, aplicar **`ingress-nginx-example.yaml`** em vez de `ingress.yaml` (ou adaptar o teu `ingress.yaml` da mesma forma).
3. Garantir `spec.ingressClassName: nginx` (recomendado). Em clusters antigos, a anotação legada `kubernetes.io/ingress.class: nginx` também pode funcionar, mas prefira `ingressClassName`.

O exemplo NGINX remove anotações Traefik, define `ingressClassName: nginx`, mantém `cert-manager.io/cluster-issuer` e usa `nginx.ingress.kubernetes.io/ssl-redirect` para forçar HTTPS. Ajusta hosts e nomes de `Secret` TLS conforme o ambiente.

```bash
kubectl apply -f k8s/ingress-nginx-example.yaml
kubectl get ingress -n gds
kubectl describe ingress -n gds gds-backend-ingress
```

Esperado: coluna **`CLASS` = `nginx`**, e após propagação **`ADDRESS`** com o IP/hostname do LoadBalancer do ingress-nginx (pode levar um ou dois minutos).

## Secrets e ConfigMaps

### Secrets necessários

| Nome | Uso |
|------|-----|
| `gds-secrets` | `DATABASE_URL`, JWT e credenciais DB (`DB_USER`, `DB_PASS`, `DB_NAME`) |
| `mail-credentials` | SMTP + `FRONTEND_URL` usados no backend |
| `gds-frontend-secrets` | `VITE_API_BASE_URL` no build do frontend |
| `gds-db-backup-s3` | Opcional; usado pelos manifests de backup S3 |

Antes de produção:

1. Atualizar senhas e `DATABASE_URL` em `gds-secrets`
2. Configurar JWT em `gds-secrets`
3. Preencher `mail-credentials` (SMTP + URL pública do frontend)
4. Ajustar `VITE_API_BASE_URL` em `gds-frontend-secrets`

Exemplo de atualização:

```bash
kubectl create secret generic gds-secrets \
  --from-literal=DB_PASS=nova_senha_segura \
  --dry-run=client -o yaml | kubectl apply -f -
```

### ConfigMap do backend (OpenTelemetry)

As variáveis de telemetria vêm do ConfigMap `gds-backend-otel` (`configmaps.yaml`) e entram no pod via `envFrom`.

| Chave | Notas |
|-------|-------|
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | vazio por padrão (SDK fica desligado) |
| `OTEL_SERVICE_NAME` | `gds-backend` |
| `OTEL_METRIC_EXPORT_INTERVAL` | intervalo de métricas (ms) |
| `OTEL_EXPORT_ERROR_LOGS_TO_LOKI` | nome histórico; no código ativa export OTLP de logs `error`/`fatal` |

Observações:

- Para desligar o SDK mesmo com endpoint definido, use `OTEL_SDK_DISABLED: "true"`.
- Pode usar endpoints separados (`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`).
- Não há cliente Loki no backend; o destino final depende do collector/infra.

## Imagens e GHCR

### Imagens

- Backend: `ghcr.io/proepi-dev/gds-admin/backend:latest`
- Frontend: `ghcr.io/proepi-dev/gds-admin/frontend:latest`
- ETL: `ghcr.io/proepi-dev/gds-admin/etl:latest`

### Build e push

```bash
./scripts/build-and-push-images.sh
./scripts/build-and-push-images.sh v1.0.0
./scripts/check-docker-context.sh
```

### Secret `ghcr-secret`

As imagens são privadas, então o secret deve existir antes de subir deployments.

Opção rápida (se já existe em outro namespace):

```bash
cd k8s
./setup-ghcr-secret.sh copy epially
```

Opção recomendada (novo secret):

```bash
cd k8s
./setup-ghcr-secret.sh
```

Opção manual:

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=SEU_USERNAME \
  --docker-password=SEU_TOKEN \
  --namespace=gds
```

Requisitos do token:

- PAT GitHub com `read:packages`
- URL para criar token: https://github.com/settings/tokens

## Deploy

### Opção 1 - Script automatizado (recomendado)

```bash
cd k8s
./deploy.sh
```

### Opção 2 - Kustomize

```bash
kubectl apply -k k8s/
```

Após Kustomize, execute migrações manualmente:

```bash
kubectl wait --for=condition=available deployment/postgres-oltp -n gds --timeout=300s
cd k8s && ./sync-migrations.sh
kubectl apply -f database-migration-job.yaml
kubectl wait --for=condition=complete job/database-migration -n gds --timeout=300s
```

### Opção 3 - Manual (passo a passo)

Execute a partir da raiz do repositório (ajusta `k8s/` se estiveres dentro de `k8s/`).

**1) Namespace**

```bash
kubectl apply -f k8s/namespace.yaml
kubectl get namespace gds
```

Esperado: `gds` com `Status Active`.

**2) Secrets**

```bash
kubectl apply -f k8s/secrets-production-example.yaml
kubectl get secret -n gds
```

Esperado: `gds-secrets`, `mail-credentials`, `gds-frontend-secrets` (nomes conforme o teu ficheiro).

**3) ConfigMaps**

```bash
kubectl apply -f k8s/configmaps.yaml
kubectl get configmap gds-backend-otel -n gds
```

Esperado: ConfigMap `gds-backend-otel` presente.

**4) PostgreSQL**

```bash
kubectl apply -f k8s/postgres-oltp-deployment.yaml
kubectl wait --for=condition=available deployment/postgres-oltp -n gds --timeout=300s
kubectl get deployment,pods -n gds -l app=postgres-oltp
```

Esperado: `deployment/postgres-oltp` com `AVAILABLE 1` e pod `Running` / `READY 1/1`.

**5) Sincronizar migrações (ConfigMap)**

```bash
cd k8s && ./sync-migrations.sh && cd ..
kubectl get configmap database-migrations -n gds
```

Esperado: ConfigMap `database-migrations` criado ou atualizado.

**6) Job de migração Flyway**

```bash
kubectl apply -f k8s/database-migration-job.yaml
kubectl wait --for=condition=complete job/database-migration -n gds --timeout=300s
kubectl get job database-migration -n gds
kubectl logs job/database-migration -n gds --tail=50
```

Esperado: Job `Complete` (ou `Succeeded` na coluna `STATUS` conforme a versão do `kubectl`) e logs sem erro fatal do Flyway.

**7) Backend**

```bash
kubectl apply -f k8s/backend-deployment.yaml
kubectl rollout status deployment/gds-backend -n gds --timeout=180s
kubectl get pods -n gds -l app=gds-backend
```

Esperado: pod `Running` e `READY 1/1` (após o rollout concluir).

**8) Frontend**

```bash
kubectl apply -f k8s/frontend-deployment.yaml
kubectl rollout status deployment/gds-frontend -n gds --timeout=180s
kubectl get pods -n gds -l app=gds-frontend
```

Esperado: pod `Running` e `READY 1/1`.

**9) Services**

```bash
kubectl apply -f k8s/services.yaml
kubectl get svc -n gds
```

Esperado: `gds-backend` e `gds-frontend` com `CLUSTER-IP` e portas definidas.

**10) Ingress**

Escolhe o manifest conforme o ingress controller do cluster (ver secção **Ingress (Traefik vs NGINX)**):

```bash
# Traefik (padrão deste repositório)
kubectl apply -f k8s/ingress.yaml

# Ingress NGINX (IngressClass `nginx`)
# kubectl apply -f k8s/ingress-nginx-example.yaml

kubectl get ingress -n gds
kubectl describe ingress -n gds gds-backend-ingress
```

Esperado: `HOSTS` correctos; coluna **`CLASS`** preenchida com o controller certo (ex.: `nginx` se usaste `ingress-nginx-example.yaml`); **`ADDRESS`** não vazio depois do controller atribuir o LoadBalancer (pode demorar).

## Banco de Dados e Migrações

### PostgreSQL OLTP (principal)

- Service: `postgres-oltp:5432`
- Storage: PVC de 10Gi
- Backend usa `DATABASE_URL`

### Fluxo de migrações (Flyway)

1. Migrações SQL em `database/migrations/`
2. `sync-migrations.sh` atualiza o ConfigMap
3. `database-migration-job.yaml` executa Flyway no cluster

Comandos úteis:

```bash
kubectl apply -f database-migration-job.yaml
kubectl logs job/database-migration -n gds
./sync-migrations.sh
kubectl get configmap database-migrations -n gds -o yaml
```

## Backup PostgreSQL -> S3 (opcional)

Os manifests `database-backup-s3-*` são exemplos e não fazem parte obrigatória do deploy da aplicação.

### Backup (Job/CronJob)

| Ficheiro | Função |
|----------|--------|
| `database-backup-s3-secrets-example.yaml` | Secret `gds-db-backup-s3` (credenciais S3 + opcional Healthchecks) |
| `database-backup-s3-job-example.yaml` | Backup pontual (`Job`) |
| `database-backup-s3-cronjob-example.yaml` | Backup agendado (`CronJob`) |

Pré-requisitos:

- `gds-secrets` com `DB_USER`, `DB_PASS`, `DB_NAME`
- Secret `gds-db-backup-s3` configurado
- Postgres acessível em `postgres-oltp:5432`

```bash
# 1) Credenciais S3
kubectl apply -f database-backup-s3-secrets-example.yaml

# 2a) Backup pontual
kubectl delete job database-backup-s3 -n gds --ignore-not-found
kubectl apply -f database-backup-s3-job-example.yaml
kubectl logs -f job/database-backup-s3 -n gds

# 2b) Backup agendado
kubectl apply -f database-backup-s3-cronjob-example.yaml
kubectl get cronjob database-backup-s3 -n gds
kubectl get jobs -n gds --sort-by=.metadata.creationTimestamp | tail -5
```

Em EKS, prefira IRSA em vez de chaves estáticas no Secret.

### Restauração a partir do S3

Backups têm formato `app-YYYYMMDD-HHMMSS.sql.gz`.

Avisos importantes:

- Operação destrutiva: idealmente execute em janela de manutenção.
- Pare o backend para evitar escrita concorrente durante o restore.
- Sem `--clean`, restaurar sobre base já populada gera conflitos (`already exists`).

#### 0) Parar o backend

```bash
kubectl scale deployment/gds-backend -n gds --replicas=0
kubectl get pods -n gds -l app=gds-backend
```

#### 1) Baixar backup do S3 (nome local normalizado)

```bash
aws s3 ls s3://backup-gds/
aws s3 cp s3://backup-gds/app-20260418-015900.sql.gz ./restore.sql.gz
```

#### 2) Carregar credenciais do DB

```bash
export DB_USER=$(kubectl get secret gds-secrets -n gds -o jsonpath='{.data.DB_USER}' | base64 -d)
export DB_NAME=$(kubectl get secret gds-secrets -n gds -o jsonpath='{.data.DB_NAME}' | base64 -d)
export DB_PASS=$(kubectl get secret gds-secrets -n gds -o jsonpath='{.data.DB_PASS}' | base64 -d)
```

#### 3) Recriar base vazia (substituição completa)

```bash
kubectl exec -i -n gds deployment/postgres-oltp -- env PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 <<EOSQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "$DB_NAME";
CREATE DATABASE "$DB_NAME";
EOSQL
```

#### 4) Preparar role ETL (evita erro `role "etl_user" does not exist`)

Antes do restore:

```bash
kubectl exec -i -n gds deployment/postgres-oltp -- env PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 <<EOSQL
CREATE USER etl_user WITH LOGIN PASSWORD 'SUBSTITUA_A_SENHA_DO_ETL';
GRANT CONNECT ON DATABASE "$DB_NAME" TO etl_user;
EOSQL
```

#### 5) Aplicar dump

Opção A (stream local -> pod):

```bash
gunzip -c ./restore.sql.gz | kubectl exec -i -n gds deployment/postgres-oltp -- \
  env PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
```

Opção B (mais resiliente para dumps longos):

```bash
PG_POD=$(kubectl get pod -n gds -l app=postgres-oltp -o jsonpath='{.items[0].metadata.name}')
kubectl cp ./restore.sql.gz "gds/$PG_POD:/tmp/restore.sql.gz"
kubectl exec -n gds "$PG_POD" -- sh -c "gunzip -c /tmp/restore.sql.gz | env PGPASSWORD=\"$DB_PASS\" psql -h 127.0.0.1 -U \"$DB_USER\" -d \"$DB_NAME\" -v ON_ERROR_STOP=1"
kubectl exec -n gds "$PG_POD" -- rm -f /tmp/restore.sql.gz
```

#### 6) Conceder permissões finais ao ETL

```bash
kubectl exec -i -n gds deployment/postgres-oltp -- env PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'EOSQL'
GRANT USAGE ON SCHEMA public TO etl_user;
GRANT SELECT ON TABLE public."user" TO etl_user;
GRANT SELECT ON TABLE public.gender TO etl_user;
GRANT SELECT ON TABLE public.location TO etl_user;
GRANT SELECT ON TABLE public.role TO etl_user;
GRANT SELECT ON TABLE public.context TO etl_user;
GRANT SELECT ON TABLE public.participation TO etl_user;
GRANT SELECT ON TABLE public.form TO etl_user;
GRANT SELECT ON TABLE public.form_version TO etl_user;
GRANT SELECT ON TABLE public.quiz_submission TO etl_user;
GRANT SELECT ON TABLE public.report TO etl_user;
EOSQL
```

#### 7) Reativar backend

```bash
kubectl scale deployment/gds-backend -n gds --replicas=1
kubectl rollout status deployment/gds-backend -n gds
```

## Verificação

```bash
kubectl get pods -n gds
kubectl get svc -n gds
kubectl get ingress -n gds
kubectl get ingressclass
kubectl logs -f deployment/gds-backend -n gds
kubectl logs -f deployment/gds-frontend -n gds
```

Nos Ingress, confere a coluna **`CLASS`** (deve corresponder ao controller, p.ex. `nginx`) e **`ADDRESS`** não vazio quando o controller atribuiu o IP/hostname.

## Monitoramento e Observabilidade

O backend exporta telemetria via OTLP (traces/métricas e logs `error`/`fatal` quando habilitado). O collector/infra decide o destino final (Loki, Grafana Cloud, etc.).

Para stack local de observabilidade, ver `observabilidade/README.md`.

```bash
# Logs do backend
kubectl logs -f deployment/gds-backend -n gds

# Health HTTP (API usa prefixo /v1)
kubectl port-forward deployment/gds-backend 3000:3000 -n gds
curl -sS http://localhost:3000/v1/health
```

## Recursos (POC)

- Backend: 1 réplica, 256Mi-512Mi RAM, 250m-500m CPU
- Frontend: 1 réplica, 64Mi-128Mi RAM, 50m-100m CPU
- ETL: CronJob a cada 6h, 128Mi-256Mi RAM, 100m-200m CPU
