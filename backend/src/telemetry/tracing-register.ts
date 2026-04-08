import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_INSTANCE_ID,
} from '@opentelemetry/semantic-conventions';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { shouldEmitErrorLogsToLoki } from '../otel-error-logs';
import { shouldStartOpenTelemetrySdk } from './otel-runtime-env';

/** Arranque do SDK Node OTel (extraído de `tracing.ts` para testes unitários). */
export function registerOpenTelemetry(): void {
  if (!shouldStartOpenTelemetrySdk()) {
    return;
  }

  const serviceName = process.env.OTEL_SERVICE_NAME ?? 'gds-backend';

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_INSTANCE_ID]:
        process.env.OTEL_SERVICE_INSTANCE_ID ?? String(process.pid),
    }),
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
      }),
    ],
    ...(shouldEmitErrorLogsToLoki()
      ? {
          logRecordProcessors: [
            new BatchLogRecordProcessor(new OTLPLogExporter()),
          ],
        }
      : {}),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-pino': { enabled: false },
      }),
      new PrismaInstrumentation(),
    ],
  });

  sdk.start();

  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;
  const logsHint = shouldEmitErrorLogsToLoki()
    ? ' | logs de erro (error/fatal) → OTLP/Loki'
    : '';
  console.log(
    `[OpenTelemetry] Telemetria ativa (service=${serviceName}, OTLP=${endpoint})${logsHint}`,
  );

  const shutdown = () => {
    void sdk.shutdown().catch(() => undefined);
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
