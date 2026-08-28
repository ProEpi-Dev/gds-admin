import { isAxiosError } from "axios";

function toReadableMessage(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => toReadableMessage(item))
      .filter((item): item is string => !!item);

    return messages.length ? messages.join(" | ") : null;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (typeof obj.message === "string") {
      return obj.message;
    }

    if (Array.isArray(obj.message)) {
      return toReadableMessage(obj.message);
    }

    if (obj.error) {
      return toReadableMessage(obj.error);
    }
  }

  return null;
}

/**
 * Extrai a mensagem de erro de uma resposta do backend
 * Tenta diferentes caminhos para encontrar a mensagem de erro
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage: string = "Erro ao processar solicitação",
): string {
  if (!error) {
    return defaultMessage;
  }

  if (isAxiosError(error)) {
    const responseData = error.response?.data;
    const parsedResponseMessage = toReadableMessage(responseData);

    if (parsedResponseMessage) {
      return parsedResponseMessage;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (typeof error === "object" && error !== null) {
    const parsedObjectMessage = toReadableMessage(error);

    if (parsedObjectMessage) {
      return parsedObjectMessage;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return defaultMessage;
}

type ApiErrorBody = {
  error?: { code?: string; message?: string; details?: unknown[] };
};

/** Código de negócio em `error.code` (ex.: EMAIL_VERIFICATION_REQUIRED). */
export function getErrorCode(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  const data = error.response?.data as ApiErrorBody | undefined;
  const code = data?.error?.code;
  return typeof code === "string" ? code : null;
}

/**
 * Primeiro item de `error.details`, quando o backend manda dado estruturado.
 *
 * O contrato usa array porque `details` nasceu para erros de validação, que são
 * vários. Casos como o da troca de contexto mandam um objeto só.
 */
export function getErrorDetails<T>(error: unknown): T | null {
  if (!isAxiosError(error)) return null;
  const data = error.response?.data as ApiErrorBody | undefined;
  const first = data?.error?.details?.[0];
  return first ? (first as T) : null;
}
