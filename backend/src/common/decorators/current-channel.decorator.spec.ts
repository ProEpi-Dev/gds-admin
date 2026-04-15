import { ExecutionContext } from '@nestjs/common';
import {
  CurrentChannel,
  gdsChannelFromExecutionContext,
} from './current-channel.decorator';

describe('gdsChannelFromExecutionContext', () => {
  it('lê request.gdsChannel e normaliza com resolveGdsChannel', () => {
    const mockGetRequest = jest.fn().mockReturnValue({ gdsChannel: 'WEB' });
    const ctx = {
      switchToHttp: () => ({ getRequest: mockGetRequest }),
    } as unknown as ExecutionContext;

    expect(gdsChannelFromExecutionContext(ctx)).toBe('web');
    expect(mockGetRequest).toHaveBeenCalled();
  });

  it('trata gdsChannel ausente como app', () => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    expect(gdsChannelFromExecutionContext(ctx)).toBe('app');
  });
});

describe('CurrentChannel', () => {
  it('é um decorator de parâmetro', () => {
    expect(typeof CurrentChannel).toBe('function');
  });
});
