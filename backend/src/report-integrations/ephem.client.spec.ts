import { EphemClient } from './ephem.client';

describe('EphemClient', () => {
  let client: EphemClient;
  let fetchMock: jest.Mock;

  const baseConfig = {
    baseUrl: 'https://api.example',
    authToken: 'Bearer tok',
    timeoutMs: 8000,
  };

  beforeEach(() => {
    client = new EphemClient();
    fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
  });

  describe('createEvent', () => {
    it('POST eventos e retorna corpo JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'ext-1', foo: 'bar' }),
      });

      const res = await client.createEvent(
        baseConfig,
        { data: { a: 1 }, aditionalData: { b: 2 } },
      );

      expect(res.id).toBe('ext-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example/api-integracao/v1/eventos',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer tok',
          }),
        }),
      );
    });

    it('lança erro quando resposta não é OK', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => 'bad gateway',
      });

      await expect(
        client.createEvent(baseConfig, { data: {}, aditionalData: {} }),
      ).rejects.toThrow('Ephem createEvent failed: HTTP 502');
    });

    it('omite Authorization quando não há token', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'x' }),
      });

      await client.createEvent(
        { baseUrl: 'https://h', timeoutMs: 1000 },
        { data: {}, aditionalData: {} },
      );

      const headers = fetchMock.mock.calls[0][1].headers as Record<
        string,
        string
      >;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('getMessages', () => {
    it('retorna _embedded.mensagens quando OK', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          _embedded: { mensagens: [{ id: '1', message: 'hi' }] },
        }),
      });

      const msgs = await client.getMessages(baseConfig, '99', 0, 10);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].message).toBe('hi');
      expect(fetchMock.mock.calls[0][0]).toContain(
        '/eventos/99/mensagens?page=0&size=10',
      );
    });

    it('retorna [] quando HTTP não OK', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'nope',
      });

      const msgs = await client.getMessages(baseConfig, '1');
      expect(msgs).toEqual([]);
    });

    it('retorna [] quando não há _embedded', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await expect(client.getMessages(baseConfig, '1')).resolves.toEqual([]);
    });
  });

  describe('sendMessage', () => {
    it('POST mensagem e retorna JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'out-9' }),
      });

      const res = await client.sendMessage(baseConfig, 'e1', 'ola');
      expect(res.id).toBe('out-9');
      expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ message: 'ola' }));
    });

    it('lança quando HTTP não OK', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'invalid',
      });

      await expect(
        client.sendMessage(baseConfig, 'e1', 'x'),
      ).rejects.toThrow('Ephem sendMessage failed: HTTP 400');
    });
  });

  describe('listSignals', () => {
    it('retorna _embedded.signals quando OK', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          _embedded: {
            signals: [{ eventId: 1, dados: {} }],
          },
        }),
      });

      const signals = await client.listSignals(baseConfig, 42, 1, 50);
      expect(signals).toHaveLength(1);
      expect(fetchMock.mock.calls[0][0]).toContain('userId=42');
      expect(fetchMock.mock.calls[0][0]).toContain('user_id=42');
    });

    it('retorna [] quando HTTP não OK', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(client.listSignals(baseConfig, 1)).resolves.toEqual([]);
    });
  });
});
