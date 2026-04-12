import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentChannel = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): 'web' | 'app' => {
    const request = ctx.switchToHttp().getRequest();
    const channel = String(request?.gdsChannel ?? '').toLowerCase();
    return channel === 'web' ? 'web' : 'app';
  },
);
