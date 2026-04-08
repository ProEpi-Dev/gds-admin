/** Condições de ambiente partilhadas entre `tracing.ts` e `otel-error-logs.ts` (testáveis sem subir o SDK). */

export function isOtelSdkDisabledEnv(): boolean {
  return (
    process.env.OTEL_SDK_DISABLED === 'true' ||
    process.env.OTEL_SDK_DISABLED === '1'
  );
}

export function isJestWorkerEnv(): boolean {
  return process.env.JEST_WORKER_ID !== undefined;
}

export function hasOtlpExporterEndpointEnv(): boolean {
  return !!(
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
  );
}

/** Igual à antiga `shouldEnable()` em `tracing.ts`. */
export function shouldStartOpenTelemetrySdk(): boolean {
  if (isOtelSdkDisabledEnv()) {
    return false;
  }
  if (isJestWorkerEnv()) {
    return false;
  }
  if (!hasOtlpExporterEndpointEnv()) {
    return false;
  }
  return true;
}

/** Base para export de logs Pino → Loki (sem considerar `OTEL_EXPORT_ERROR_LOGS_TO_LOKI`). */
export function isErrorLogsToLokiDisabledByFlag(): boolean {
  return (
    process.env.OTEL_EXPORT_ERROR_LOGS_TO_LOKI === 'false' ||
    process.env.OTEL_EXPORT_ERROR_LOGS_TO_LOKI === '0'
  );
}
