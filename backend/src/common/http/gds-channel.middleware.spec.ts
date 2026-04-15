import { applyGdsChannelMiddleware } from './gds-channel.middleware';

describe('applyGdsChannelMiddleware', () => {
  it('define gdsChannel no request e chama next', () => {
    const next = jest.fn();
    const req = {
      headers: { 'x-gds-channel': 'web' },
    } as any;
    const res = {} as any;

    applyGdsChannelMiddleware(req, res, next);

    expect(req.gdsChannel).toBe('web');
    expect(next).toHaveBeenCalled();
  });
});
