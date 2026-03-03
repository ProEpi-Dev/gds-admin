import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Exige que o usuário tenha pelo menos um dos papéis (global ou no contexto da rota).
 * Ex.: @Roles('admin', 'manager')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
