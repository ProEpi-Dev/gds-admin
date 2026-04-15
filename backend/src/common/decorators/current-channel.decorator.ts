import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { resolveGdsChannel } from '../http/gds-channel';

export const CurrentChannel = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): 'web' | 'app' => {
    const request = ctx.switchToHttp().getRequest();
    return resolveGdsChannel(request?.gdsChannel);
  },
);
