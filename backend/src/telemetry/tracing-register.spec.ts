jest.mock('./otel-runtime-env', () => ({
  ...jest.requireActual<typeof import('./otel-runtime-env')>('./otel-runtime-env'),
  shouldStartOpenTelemetrySdk: jest.fn(),
}));

jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: jest.fn(),
}));

jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: jest.fn(() => []),
}));

jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: jest.fn(),
}));

jest.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
  OTLPMetricExporter: jest.fn(),
}));

jest.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: jest.fn(),
}));

jest.mock('@opentelemetry/sdk-logs', () => ({
  BatchLogRecordProcessor: jest.fn(),
}));

jest.mock('@opentelemetry/sdk-metrics', () => ({
  PeriodicExportingMetricReader: jest.fn(),
}));

jest.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: jest.fn(() => ({})),
}));

jest.mock('@prisma/instrumentation', () => ({
  PrismaInstrumentation: jest.fn().mockImplementation(() => ({})),
}));

import { NodeSDK } from '@opentelemetry/sdk-node';
import { shouldStartOpenTelemetrySdk } from './otel-runtime-env';
import { registerOpenTelemetry } from './tracing-register';

describe('registerOpenTelemetry', () => {
  const origEnv = { ...process.env };
  let mockStart: jest.Mock;
  let mockShutdown: jest.Mock;

  beforeEach(() => {
    process.env = { ...origEnv };
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    delete process.env.OTEL_SDK_DISABLED;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockStart = jest.fn();
    mockShutdown = jest.fn().mockResolvedValue(undefined);
    (NodeSDK as jest.Mock).mockImplementation(() => ({
      start: mockStart,
      shutdown: mockShutdown,
    }));
    jest.mocked(shouldStartOpenTelemetrySdk).mockReset();
  });

  afterEach(() => {
    process.env = { ...origEnv };
    jest.restoreAllMocks();
  });

  it('não inicia o SDK quando shouldStartOpenTelemetrySdk é false', () => {
    jest.mocked(shouldStartOpenTelemetrySdk).mockReturnValue(false);
    registerOpenTelemetry();
    expect(NodeSDK).not.toHaveBeenCalled();
  });

  it('inicia o SDK e regista shutdown em SIGTERM/SIGINT quando habilitado', () => {
    jest.mocked(shouldStartOpenTelemetrySdk).mockReturnValue(true);
    let onSigterm: (() => void) | undefined;
    const term = jest
      .spyOn(process, 'once')
      .mockImplementation(((event: string, fn: () => void) => {
        if (event === 'SIGTERM') {
          onSigterm = fn;
        }
        return process;
      }) as typeof process.once);

    registerOpenTelemetry();

    expect(NodeSDK).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[OpenTelemetry]'),
    );
    expect(term).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(term).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    expect(onSigterm).toBeDefined();
    onSigterm!();
    expect(mockShutdown).toHaveBeenCalled();
  });
});
