import { inspect } from 'node:util';
import { context, trace } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import type { LogAttributes } from '@opentelemetry/api-logs';
import {
  hasOtlpExporterEndpointEnv,
  isErrorLogsToLokiDisabledByFlag,
  isJestWorkerEnv,
  isOtelSdkDisabledEnv,
} from './telemetry/otel-runtime-env';

const PINO_ERROR = 50;
const PINO_FATAL = 60;

/** Exporta só níveis error/fatal do Pino para Loki via OTLP (collector → Loki). */
export function shouldEmitErrorLogsToLoki(): boolean {
  if (isOtelSdkDisabledEnv()) {
    return false;
  }
  if (isJestWorkerEnv()) {
    return false;
  }
  if (isErrorLogsToLokiDisabledByFlag()) {
    return false;
  }
  return hasOtlpExporterEndpointEnv();
}

function formatArgForLogBody(arg: unknown): string {
  if (arg === null) {
    return 'null';
  }
  const t = typeof arg;
  if (t === 'string') {
    return arg as string;
  }
  if (t === 'number') {
    return (arg as number).toString();
  }
  if (t === 'boolean') {
    return (arg as boolean) ? 'true' : 'false';
  }
  if (t === 'bigint') {
    return (arg as bigint).toString();
  }
  if (t === 'symbol') {
    return (arg as symbol).toString();
  }
  if (t === 'function') {
    const fn = arg as (...args: unknown[]) => unknown;
    return `[Function: ${fn.name || 'anonymous'}]`;
  }
  return inspect(arg, { depth: 6, breakLength: 120, maxStringLength: 2_000 });
}

function serializePinoArgs(args: unknown[]): { body: string; attributes: LogAttributes } {
  const attributes: LogAttributes = {};
  const parts: string[] = [];

  for (const arg of args) {
    if (typeof arg === 'string') {
      parts.push(arg);
    } else if (arg instanceof Error) {
      attributes['exception.type'] = arg.name;
      attributes['exception.message'] = arg.message;
      if (arg.stack) {
        attributes['exception.stacktrace'] = arg.stack;
      }
    } else if (arg !== null && typeof arg === 'object') {
      try {
        parts.push(JSON.stringify(arg));
      } catch {
        parts.push(formatArgForLogBody(arg));
      }
    } else if (arg !== undefined) {
      parts.push(formatArgForLogBody(arg));
    }
  }

  const spanContext = trace.getSpanContext(context.active());
  if (spanContext) {
    attributes.trace_id = spanContext.traceId;
    attributes.span_id = spanContext.spanId;
  }

  return { body: parts.join(' ').trim() || 'error', attributes };
}

export function emitPinoErrorLogToOtel(level: number, args: unknown[]): void {
  if (!shouldEmitErrorLogsToLoki() || level < PINO_ERROR) {
    return;
  }

  try {
    const { body, attributes } = serializePinoArgs(args);
    const fatal = level >= PINO_FATAL;
    const logger = logs.getLogger(process.env.OTEL_SERVICE_NAME ?? 'gds-backend', '1.0.0');
    logger.emit({
      severityNumber: fatal ? SeverityNumber.FATAL : SeverityNumber.ERROR,
      severityText: fatal ? 'FATAL' : 'ERROR',
      body,
      attributes,
      context: context.active(),
    });
  } catch {
    // Nunca falhar o pipeline de logging da aplicação
  }
}

/** Gatilho Pino `hooks.logMethod` — só emite OTel para error (50) e fatal (60). */
export function buildPinoOtelErrorHooks():
  | undefined
  | {
      logMethod(
        this: unknown,
        inputArgs: unknown[],
        method: (...args: unknown[]) => unknown,
        level: number,
      ): unknown;
    } {
  if (!shouldEmitErrorLogsToLoki()) {
    return undefined;
  }

  return {
    logMethod(inputArgs, method, level) {
      if (level >= PINO_ERROR) {
        emitPinoErrorLogToOtel(level, inputArgs);
      }
      return method.apply(this, inputArgs);
    },
  };
}
