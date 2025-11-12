import { AxiosError } from 'axios';

/**
 * Extrai a mensagem de erro de uma resposta do backend
 * Tenta diferentes caminhos para encontrar a mensagem de erro
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'Erro ao processar solicitação'): string {
  if (!error) {
    return defaultMessage;
  }

  // Se for um AxiosError
  if (error instanceof AxiosError) {
    const responseData = error.response?.data;

    // Tenta: error.error.message (estrutura padrão do backend NestJS)
    if (responseData?.error?.message) {
      return responseData.error.message;
    }

    // Tenta: error.message (mensagem direta)
    if (responseData?.message) {
      return responseData.message;
    }

    // Tenta: error.message do Axios
    if (error.message) {
      return error.message;
    }
  }

  // Se for um Error comum
  if (error instanceof Error) {
    return error.message;
  }

  // Se for uma string
  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}

