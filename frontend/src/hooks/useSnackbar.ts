import { useSnackbar as useNotistackSnackbar } from 'notistack';

/**
 * Hook customizado para facilitar o uso de notificações
 * Encapsula o notistack com métodos mais simples
 */
export function useSnackbar() {
  const { enqueueSnackbar, closeSnackbar } = useNotistackSnackbar();

  const showSuccess = (message: string) => {
    enqueueSnackbar(message, {
      variant: 'success',
    });
  };

  const showError = (message: string) => {
    enqueueSnackbar(message, {
      variant: 'error',
    });
  };

  const showWarning = (message: string) => {
    enqueueSnackbar(message, {
      variant: 'warning',
    });
  };

  const showInfo = (message: string) => {
    enqueueSnackbar(message, {
      variant: 'info',
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    closeSnackbar,
  };
}

