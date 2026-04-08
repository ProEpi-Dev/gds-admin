import {
  isOtelSdkDisabledEnv,
  isJestWorkerEnv,
  hasOtlpExporterEndpointEnv,
  shouldStartOpenTelemetrySdk,
  isErrorLogsToLokiDisabledByFlag,
} from './otel-runtime-env';

describe('otel-runtime-env', () => {
  const orig = { ...process.env };

  afterEach(() => {
    process.env = { ...orig };
  });

  it('isOtelSdkDisabledEnv: true para true ou 1', () => {
    process.env.OTEL_SDK_DISABLED = 'true';
    expect(isOtelSdkDisabledEnv()).toBe(true);
    process.env.OTEL_SDK_DISABLED = '1';
    expect(isOtelSdkDisabledEnv()).toBe(true);
  });

  it('isOtelSdkDisabledEnv: false quando ausente ou outro valor', () => {
    delete process.env.OTEL_SDK_DISABLED;
    expect(isOtelSdkDisabledEnv()).toBe(false);
    process.env.OTEL_SDK_DISABLED = 'false';
    expect(isOtelSdkDisabledEnv()).toBe(false);
  });

  it('isJestWorkerEnv reflete JEST_WORKER_ID', () => {
    process.env.JEST_WORKER_ID = '1';
    expect(isJestWorkerEnv()).toBe(true);
    delete process.env.JEST_WORKER_ID;
    expect(isJestWorkerEnv()).toBe(false);
  });

  it('hasOtlpExporterEndpointEnv: qualquer endpoint OTLP', () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;
    expect(hasOtlpExporterEndpointEnv()).toBe(false);

    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://x';
    expect(hasOtlpExporterEndpointEnv()).toBe(true);
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = 'http://t';
    expect(hasOtlpExporterEndpointEnv()).toBe(true);
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = 'http://m';
    expect(hasOtlpExporterEndpointEnv()).toBe(true);
  });

  it('shouldStartOpenTelemetrySdk: false se SDK desligado, jest, ou sem endpoint', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    delete process.env.JEST_WORKER_ID;
    delete process.env.OTEL_SDK_DISABLED;
    expect(shouldStartOpenTelemetrySdk()).toBe(true);

    process.env.OTEL_SDK_DISABLED = 'true';
    expect(shouldStartOpenTelemetrySdk()).toBe(false);
    delete process.env.OTEL_SDK_DISABLED;

    process.env.JEST_WORKER_ID = '1';
    expect(shouldStartOpenTelemetrySdk()).toBe(false);
    delete process.env.JEST_WORKER_ID;

    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    expect(shouldStartOpenTelemetrySdk()).toBe(false);
  });

  it('isErrorLogsToLokiDisabledByFlag', () => {
    delete process.env.OTEL_EXPORT_ERROR_LOGS_TO_LOKI;
    expect(isErrorLogsToLokiDisabledByFlag()).toBe(false);
    process.env.OTEL_EXPORT_ERROR_LOGS_TO_LOKI = 'false';
    expect(isErrorLogsToLokiDisabledByFlag()).toBe(true);
    process.env.OTEL_EXPORT_ERROR_LOGS_TO_LOKI = '0';
    expect(isErrorLogsToLokiDisabledByFlag()).toBe(true);
  });
});
