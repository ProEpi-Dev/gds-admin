import { trace } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import * as otelRuntimeEnv from './telemetry/otel-runtime-env';
import {
  shouldEmitErrorLogsToLoki,
  emitPinoErrorLogToOtel,
  buildPinoOtelErrorHooks,
} from './otel-error-logs';

describe('otel-error-logs', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
    jest.restoreAllMocks();
  });

  describe('shouldEmitErrorLogsToLoki', () => {
    it('reflete flags de ambiente (via otel-runtime-env)', () => {
      jest.spyOn(otelRuntimeEnv, 'isOtelSdkDisabledEnv').mockReturnValue(true);
      jest.spyOn(otelRuntimeEnv, 'isJestWorkerEnv').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'isErrorLogsToLokiDisabledByFlag').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'hasOtlpExporterEndpointEnv').mockReturnValue(true);
      expect(shouldEmitErrorLogsToLoki()).toBe(false);

      jest.spyOn(otelRuntimeEnv, 'isOtelSdkDisabledEnv').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'isJestWorkerEnv').mockReturnValue(true);
      expect(shouldEmitErrorLogsToLoki()).toBe(false);

      jest.spyOn(otelRuntimeEnv, 'isJestWorkerEnv').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'isErrorLogsToLokiDisabledByFlag').mockReturnValue(true);
      expect(shouldEmitErrorLogsToLoki()).toBe(false);

      jest.spyOn(otelRuntimeEnv, 'isErrorLogsToLokiDisabledByFlag').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'hasOtlpExporterEndpointEnv').mockReturnValue(false);
      expect(shouldEmitErrorLogsToLoki()).toBe(false);

      jest.spyOn(otelRuntimeEnv, 'hasOtlpExporterEndpointEnv').mockReturnValue(true);
      expect(shouldEmitErrorLogsToLoki()).toBe(true);
    });
  });

  describe('emitPinoErrorLogToOtel', () => {
    beforeEach(() => {
      jest.spyOn(otelRuntimeEnv, 'isOtelSdkDisabledEnv').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'isJestWorkerEnv').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'isErrorLogsToLokiDisabledByFlag').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'hasOtlpExporterEndpointEnv').mockReturnValue(true);
      jest.spyOn(trace, 'getSpanContext').mockReturnValue({
        traceId: 'aa',
        spanId: 'bb',
      } as any);
    });

    it('não emite quando nível < error', () => {
      const emit = jest.fn();
      jest.spyOn(logs, 'getLogger').mockReturnValue({
        emit,
      } as any);

      emitPinoErrorLogToOtel(40, ['info']);

      expect(emit).not.toHaveBeenCalled();
    });

    it('emite ERROR com corpo e atributos (string, Error, objeto, span)', () => {
      const emit = jest.fn();
      jest.spyOn(logs, 'getLogger').mockReturnValue({
        emit,
      } as any);

      const err = new Error('boom');
      err.stack = 'stack-line';

      emitPinoErrorLogToOtel(50, ['prefix', err, 42]);

      expect(emit).toHaveBeenCalledTimes(1);
      const payload = emit.mock.calls[0][0];
      expect(payload.severityText).toBe('ERROR');
      expect(payload.body).toContain('prefix');
      expect(payload.body).toContain('42');
      expect(payload.attributes['exception.type']).toBe('Error');
      expect(payload.attributes['exception.message']).toBe('boom');
      expect(payload.attributes.trace_id).toBe('aa');
    });

    it('usa stringify com fallback quando JSON.stringify falha', () => {
      const emit = jest.fn();
      jest.spyOn(logs, 'getLogger').mockReturnValue({
        emit,
      } as any);

      const circular: Record<string, unknown> = {};
      circular.self = circular;

      emitPinoErrorLogToOtel(50, [circular]);

      expect(emit).toHaveBeenCalled();
      const payload = emit.mock.calls[0][0];
      expect(String(payload.body)).toMatch(/Circular|self/);
    });

    it('FATAL quando nível >= 60', () => {
      const emit = jest.fn();
      jest.spyOn(logs, 'getLogger').mockReturnValue({
        emit,
      } as any);

      emitPinoErrorLogToOtel(60, ['dead']);

      expect(emit.mock.calls[0][0].severityText).toBe('FATAL');
    });

    it('ignora falhas do logger.emit', () => {
      jest.spyOn(logs, 'getLogger').mockReturnValue({
        emit: () => {
          throw new Error('otel down');
        },
      } as any);

      expect(() => emitPinoErrorLogToOtel(50, ['x'])).not.toThrow();
    });

    it('formata null, boolean, bigint, symbol e função nomeada no corpo', () => {
      const emit = jest.fn();
      jest.spyOn(logs, 'getLogger').mockReturnValue({
        emit,
      } as any);

      emitPinoErrorLogToOtel(50, [
        null,
        true,
        BigInt(7),
        Symbol('s'),
        function namedFn() {
          return 0;
        },
      ]);

      const body = emit.mock.calls[0][0].body as string;
      expect(body).toContain('null');
      expect(body).toContain('true');
      expect(body).toMatch(/7/);
      expect(body).toContain('Symbol');
      expect(body).toContain('[Function: namedFn]');
    });
  });

  describe('buildPinoOtelErrorHooks', () => {
    it('retorna undefined quando export está desligado', () => {
      jest.spyOn(otelRuntimeEnv, 'hasOtlpExporterEndpointEnv').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'isOtelSdkDisabledEnv').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'isJestWorkerEnv').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'isErrorLogsToLokiDisabledByFlag').mockReturnValue(false);

      expect(buildPinoOtelErrorHooks()).toBeUndefined();
    });

    it('logMethod repassa ao método original e emite em error+', () => {
      jest.spyOn(otelRuntimeEnv, 'isOtelSdkDisabledEnv').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'isJestWorkerEnv').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'isErrorLogsToLokiDisabledByFlag').mockReturnValue(false);
      jest.spyOn(otelRuntimeEnv, 'hasOtlpExporterEndpointEnv').mockReturnValue(true);
      jest.spyOn(trace, 'getSpanContext').mockReturnValue(undefined as any);

      const emit = jest.fn();
      jest.spyOn(logs, 'getLogger').mockReturnValue({
        emit,
      } as any);

      const hooks = buildPinoOtelErrorHooks();
      expect(hooks).toBeDefined();

      const method = jest.fn().mockReturnValue('ok');
      const result = hooks!.logMethod.call({}, ['a'], method, 50);

      expect(result).toBe('ok');
      expect(method).toHaveBeenCalledWith('a');
      expect(emit).toHaveBeenCalled();

      emit.mockClear();
      hooks!.logMethod.call({}, ['b'], method, 30);
      expect(emit).not.toHaveBeenCalled();
    });
  });
});
