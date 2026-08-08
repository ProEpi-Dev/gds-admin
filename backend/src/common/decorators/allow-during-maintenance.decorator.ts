import { SetMetadata } from '@nestjs/common';

export const ALLOW_DURING_MAINTENANCE_KEY = 'allowDuringMaintenance';

/**
 * Libera o endpoint mesmo com janela de indisponibilidade ativa.
 *
 * Reservado ao mínimo necessário para sair da manutenção: health check e
 * autenticação (sem login não há como o admin assumir o bypass por papel e
 * encerrar a janela pelo console).
 */
export const AllowDuringMaintenance = () =>
  SetMetadata(ALLOW_DURING_MAINTENANCE_KEY, true);
