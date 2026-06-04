---
sidebar_position: 8
title: Observabilidade (OpenTelemetry)
description: Stack local Grafana LGTM, variáveis OTEL no backend e dashboards.
---

# Observabilidade (OpenTelemetry)

Telemetria **opcional** no backend NestJS. Stack local em `observabilidade/` do monorepo (Grafana OTEL LGTM).

## Subir stack local

```bash
cd observabilidade
docker compose up -d
```

| Serviço | URL |
|---------|-----|
| Grafana | http://localhost:4000 (admin / admin) |
| OTLP HTTP | http://127.0.0.1:4318 |

A porta **4000** evita conflito com o backend na **3000**.

## Ativar no backend

Cole em `backend/.env` (ver também `backend/.env.example`):

```env
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
OTEL_SERVICE_NAME=gds-backend
```

Reinicie com `yarn start:dev`. Se o SDK subir, aparece log do tipo `[OpenTelemetry] Telemetria ativa`.

| Variável | Efeito |
|----------|--------|
| `OTEL_SDK_DISABLED=true` | Desliga o SDK |
| `OTEL_EXPORT_ERROR_LOGS_TO_LOKI=false` | Mantém traces/métricas mas não envia logs Pino error/fatal ao Loki |
| `OTEL_METRIC_EXPORT_INTERVAL` | Intervalo de export de métricas (ms) |

Sem `OTEL_EXPORTER_OTLP_*` definido, o processo sobe **sem** exportar telemetria (adequado para máquinas sem collector).

## Dashboards Grafana

Importar JSON em `observabilidade/grafana/dashboards/`:

| Ficheiro | Conteúdo |
|----------|----------|
| `gds-api-tempo.json` | Traces (Tempo) |
| `gds-api-prometheus.json` | HTTP RED (Prometheus) |
| `gds-business-prometheus.json` | Métricas de negócio (`gds_*_total`) |
| `gds-syndromic-classification-prometheus.json` | Classificação sindrômica |

Guia completo com troubleshooting: `observabilidade/README.md` no repositório.

## Produção

Em Kubernetes, configure `OTEL_*` nos secrets do backend (`k8s/`) e aponte para o collector do cluster. Não confundir com as **views materializadas BI** (`V41`) usadas pelo Metabase — ver [Integração BI](/integracao-bi-export-sindromico).

---

**Última atualização**: Junho 2026
