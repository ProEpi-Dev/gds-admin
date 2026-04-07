# Observabilidade local (Grafana OTEL LGTM)

Stack em **um container** para desenvolvimento e testes: OpenTelemetry Collector, Grafana, Loki, Tempo, Prometheus e componentes auxiliares (ver [docker-otel-lgtm](https://github.com/grafana/docker-otel-lgtm)).

## Subir

Na raiz desta pasta:

```bash
docker compose up -d
```

## URLs e credenciais

| O quê        | URL                     |
|-------------|-------------------------|
| Grafana     | http://localhost:4000 |
| OTLP HTTP   | `http://127.0.0.1:4318` |
| OTLP gRPC   | `127.0.0.1:4317`        |

Usuário / senha padrão do Grafana: **admin** / **admin**.

A UI do Grafana usa a porta **4000** no host para não conflitar com o backend Nest na **3000**.

## Enviar telemetria do backend

O `gds-backend` só inicializa o SDK OpenTelemetry quando **algum** endpoint OTLP está definido (`OTEL_EXPORTER_OTLP_ENDPOINT` e/ou os endpoints por sinal). O `main.ts` carrega o `.env` com `dotenv/config` **antes** do `tracing.ts`, então você pode colar as variáveis no `backend/.env` (veja `backend/.env.example`).

Exemplo no `.env`:

```env
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
OTEL_SERVICE_NAME=gds-backend
```

Alternativa: exportar no shell antes do `yarn start:dev`:

```bash
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
yarn --cwd ../backend start:dev
```

No arranque do processo, se o SDK estiver ativo, aparece uma linha como:
`[OpenTelemetry] Telemetria ativa (service=gds-backend, OTLP=...)`
(também em **production**, útil para confirmar no k8s / logs).

Se **não** aparecer e também **não** houver erro: o SDK não subiu — em geral faltou exportar `OTEL_EXPORTER_OTLP_ENDPOINT` (ou endpoint por sinal).

Depois, gere tráfego na API (ex.: Swagger em http://localhost:3000/api) e no Grafana use **Explore → Tempo** (traces) ou **Explore → Prometheus** (métricas com prefixos como `http.server.duration`) para confirmar que os dados chegam.

Para desligar o SDK: `OTEL_SDK_DISABLED=true`.

O backend pode enviar **só logs Pino `error` / `fatal`** para o mesmo OTLP (→ Loki), sem mandar `info`/`warn`. Está **ligado por defeito** quando o SDK OTel está ativo; defina `OTEL_EXPORT_ERROR_LOGS_TO_LOKI=false` para desativar só o envio de logs.

Em ambientes sem collector, **não** defina `OTEL_EXPORTER_OTLP_*` — o processo sobe sem tentar exportar telemetria.

## Dashboard Tempo (importar JSON)

1. Grafana → **Dashboards** → **New** → **Import**.
2. Upload de `grafana/dashboards/gds-api-tempo.json` (nesta pasta).
3. Escolha o datasource **Tempo** (no otel-lgtm o nome é “Tempo”, uid `tempo`).
4. Ajuste a variável **service.name** se usar outro `OTEL_SERVICE_NAME`.

O dashboard mistura **TraceQL metrics** (séries RED e quebras por span) e **tabelas** de busca. Se as séries ficarem vazias, confira se o Tempo da sua instância tem [TraceQL metrics](https://grafana.com/docs/tempo/latest/operations/traceql-metrics/) ativo; as tabelas devem listar traces mesmo assim.

### Dashboard Prometheus (HTTP)

Importe `grafana/dashboards/gds-api-prometheus.json` (datasource **Prometheus**, uid `prometheus`). O Node OTel por omissão expõe **`http_server_duration_milliseconds_*`** e labels **`http_method`** / **`http_status_code`** (não os nomes da semconv estável). O dashboard usa isso nos painéis principais; `http_server_request_duration_seconds_*` está numa secção opcional. Filtro por **`job`**. Reimporte o JSON após atualizações.

## Parar

```bash
docker compose down
```
