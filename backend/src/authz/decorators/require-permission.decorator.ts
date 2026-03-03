import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * Exige que o usuário tenha a permissão no contexto da rota (ou global para admin).
 * Ex.: @RequirePermission('content-type:manage')
 */
export const RequirePermission = (permissionCode: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissionCode);
