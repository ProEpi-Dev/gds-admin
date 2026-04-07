# Kubernetes — OTEL LGTM (observabilidade)

Manifests mínimos para subir apenas a imagem **grafana/otel-lgtm** no cluster, no mesmo espírito da pasta raiz [`k8s/`](../../k8s/) (namespace dedicado, labels, script de deploy).

**Atenção:** o upstream descreve este stack como adequado para **demo e testes**, não para produção. Dados ficam em `emptyDir` (efémeros).

## Estrutura

| Ficheiro | Descrição |
|----------|-----------|
| `namespace.yaml` | Namespace `gds-observabilidade` |
| `lgtm-stack.yaml` | Service + Deployment (`otel-lgtm`) |
| `ingress.yaml` | ingress-nginx (+ cert-manager): Grafana + OTLP HTTP com **whitelist de IP** no OTLP |
| `deploy.sh` | Aplica manifests (inclui Ingress) e espera o rollout |

## Deploy

```bash
cd observabilidade/k8s
chmod +x deploy.sh
./deploy.sh
```

Ou manualmente:

```bash
kubectl apply -f namespace.yaml
kubectl apply -f lgtm-stack.yaml
kubectl rollout status deployment/otel-lgtm -n gds-observabilidade --timeout=300s
```

## Portas do Service

| Porta | Uso |
|-------|-----|
| 3000 | Grafana |
| 4040 | Pyroscope |
| 4317 | OTLP gRPC |
| 4318 | OTLP HTTP |
| 9090 | Prometheus (UI/API) |

## Acesso local (port-forward)

```bash
kubectl port-forward -n gds-observabilidade svc/otel-lgtm \
  3000:3000 4317:4317 4318:4318 9090:9090 4040:4040
```

- Grafana: <http://localhost:3000> (credenciais por defeito do LGTM, ver [docker-otel-lgtm](https://github.com/grafana/docker-otel-lgtm)).

O `lgtm-stack.yaml` define `GF_AUTH_ANONYMOUS_ENABLED=false` no container para **obrigar login** no Grafana, sem editar `grafana.ini`.

## Ingress (Grafana + OTLP com filtro de origem)

Alinhado a um Ingress **ingress-nginx** + **cert-manager** (ex.: Metabase: `ingressClassName: nginx`, `cert-manager.io/cluster-issuer: letsencrypt-prod`, `proxy-body-size`, `ssl-redirect`).

1. No Ingress OTLP, `nginx.ingress.kubernetes.io/whitelist-source-range` deve listar o **IP público de saída** da VPS onde corre o backend (no repo: `212.85.20.154/32`). Vários: `"IP1/32,IP2/32"` (vírgula, sem espaços).
2. Ajuste `host` e `secretName` nos dois Ingress se não usar `gds-grafana.maolabs.com.br` e `gds-otel.maolabs.com.br`.
3. DNS desses nomes deve apontar para o IP onde o **ingress-nginx** expõe HTTP/HTTPS (ex.: mesmo nó k3s com `svclb` ou LoadBalancer).

| Host | Backend | Filtro |
|------|---------|--------|
| `gds-grafana.maolabs.com.br` | Service `otel-lgtm:3000` | Não (use login forte no Grafana) |
| `gds-otel.maolabs.com.br` | Service `otel-lgtm:4318` | **Sim** — `whitelist-source-range` |

**Backend na VPS1 (fora do cluster):** use `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` e `OTEL_EXPORTER_OTLP_ENDPOINT=https://gds-otel.maolabs.com.br`.

**Let's Encrypt:** o cert-manager cria Ingress temporário para `/.well-known/acme-challenge/` — em geral **não** passa pela whitelist deste host; se o certificado falhar, confira `kubectl describe certificate -n gds-observabilidade` e ordem das regras.

**Proxy à frente (Cloudflare, etc.):** o nginx vê o IP do proxy; ajuste whitelist no proxy ou use `use-forwarded-headers` / `real-ip` conforme a doc do ingress-nginx.

## Backend no mesmo cluster (OTLP)

Exemplo de endpoint HTTP para variáveis `OTEL_EXPORTER_OTLP_ENDPOINT` / traces:

`http://otel-lgtm.gds-observabilidade.svc.cluster.local:4318`

(ajuste o namespace se o alterar.)

## OpenShift

Se o pod não ficar *ready* por não poder escrever em diretórios na raiz, veja a nota em [docker-otel-lgtm#132](https://github.com/grafana/docker-otel-lgtm/issues/132).

## Referência upstream

- [grafana/docker-otel-lgtm — k8s/lgtm.yaml](https://github.com/grafana/docker-otel-lgtm/blob/main/k8s/lgtm.yaml)
