import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parâmetro que extrai o contextId da requisição para o Guard de autorização.
 * Ordem: param 'contextId' > param 'context_id' > body.contextId > body.context_id.
 */
export const ContextId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const params = request.params || {};
    const body = request.body || {};
    return (
      params.contextId ??
      params.context_id ??
      body.contextId ??
      body.context_id
    );
  },
);
