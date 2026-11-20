import { ConflictException } from '@nestjs/common';
import {
  EphemClient,
  ephemHtmlToText,
  normalizeEphemMessage,
} from './ephem.client';

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

    it('converte o formato real do integrador: author_id.name e date (UTC) viram author e createdAt', async () => {
      // corpo como o integrador devolve (SinalMensagem serializada pelo Spring HATEOAS)
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          _embedded: {
            mensagens: [
              {
                date: '2026-11-18 10:30:00',
                subject: '',
                signal_id: 555,
                message_type: 'comment',
                id: 99,
                body: '<p>Recebido, vamos verificar.</p>',
                partner_ids: [3],
                author_id: { id: 3, name: 'Equipe CIEVS' },
              },
            ],
          },
          page: { size: 99, totalElements: 1, totalPages: 1, number: 0 },
        }),
      });

      const [msg] = await client.getMessages(baseConfig, '10');

      expect(msg.id).toBe(99);
      // o corpo HTML do Odoo chega ao app como texto
      expect(msg.body).toBe('Recebido, vamos verificar.');
      expect(msg.author).toBe('Equipe CIEVS');
      expect(msg.createdAt).toBe('2026-11-18T10:30:00Z');
    });
  });

  describe('normalizeEphemMessage', () => {
    it('mantém author e createdAt quando já vêm prontos', () => {
      const msg = normalizeEphemMessage({
        id: '1',
        author: 'suporte',
        createdAt: '2024-06-01T12:00:00.000Z',
        author_id: { id: 1, name: 'outro' },
        date: '2020-01-01 00:00:00',
      });
      expect(msg.author).toBe('suporte');
      expect(msg.createdAt).toBe('2024-06-01T12:00:00.000Z');
    });

    it('aceita author_id no formato cru do Odoo ([id, name])', () => {
      expect(
        normalizeEphemMessage({ id: '1', author_id: [7, 'GDS App'] }).author,
      ).toBe('GDS App');
    });

    it('sem autor (false/null) ou data inválida: campos ficam undefined', () => {
      const msg = normalizeEphemMessage({
        id: '1',
        author_id: false,
        date: 'ontem',
      });
      expect(msg.author).toBeUndefined();
      expect(msg.createdAt).toBeUndefined();
      expect(
        normalizeEphemMessage({ id: '2', author_id: null, date: false }).author,
      ).toBeUndefined();
    });

    it('converte o corpo HTML em texto (nota do ePHEM 18 com menção ao GDS App)', () => {
      const msg = normalizeEphemMessage({
        id: '3',
        body: '<a href="/odoo/res.partner/2097" class="o_mail_redirect" rel="nofollow">&#64;GDS APP</a> [TESTE] Obrigado pelo relato. A equipa vai verificar &amp; responder.',
      });
      expect(msg.body).toBe(
        '[TESTE] Obrigado pelo relato. A equipa vai verificar & responder.',
      );
    });
  });

  describe('ephemHtmlToText', () => {
    it('parágrafos, <br> e listas viram quebras de linha', () => {
      expect(
        ephemHtmlToText(
          '<p>Olá,</p><p>Linha 1<br>Linha 2</p><ul><li>um</li><li>dois</li></ul>',
        ),
      ).toBe('Olá,\nLinha 1\nLinha 2\n- um\n- dois');
    });

    it('remove só as menções do início; no meio do texto vira "@Nome"', () => {
      expect(
        ephemHtmlToText(
          '<p><a href="/odoo/res.partner/2097">@GDS APP</a>, fale com <a href="/odoo/res.partner/12">&#64;Maria</a> amanhã.</p>',
        ),
      ).toBe('fale com @Maria amanhã.');
    });

    it('decodifica entidades nomeadas, decimais e hexadecimais', () => {
      expect(
        ephemHtmlToText('a&nbsp;b &lt;c&gt; &quot;d&quot; &#233; &#xE7;'),
      ).toBe('a b <c> "d" é ç');
    });

    it('texto simples e mensagem apagada (span vazio)', () => {
      expect(ephemHtmlToText('Mensagem simples')).toBe('Mensagem simples');
      expect(
        ephemHtmlToText('<span class="o-mail-Message-edited"></span>'),
      ).toBe('');
    });
  });

  describe('getEvent', () => {
    it('GET eventos/{id} e retorna o detalhe (status/statusMessage/signalId)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 887,
          status: 'PROCESSADO',
          statusMessage: 'signal criado com sucesso com id: 285',
          signalId: 285,
        }),
      });

      const detail = await client.getEvent(baseConfig, '887');
      expect(detail?.status).toBe('PROCESSADO');
      expect(detail?.signalId).toBe(285);
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.example/api-integracao/v1/eventos/887',
      );
      expect(fetchMock.mock.calls[0][1].method).toBe('GET');
    });

    it('retorna null quando HTTP não OK', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'nope',
      });

      await expect(client.getEvent(baseConfig, '1')).resolves.toBeNull();
    });

    it('retorna null quando corpo não é objeto', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => null,
      });

      await expect(client.getEvent(baseConfig, '1')).resolves.toBeNull();
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

    it('409 (evento ainda não virou signal no ePHEM) vira ConflictException com mensagem amigável', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 409,
        text: async () =>
          '{"message":"o evento ainda nao foi enviado ao ePHEM"}',
      });

      const erro = client.sendMessage(baseConfig, 'e1', 'x');
      await expect(erro).rejects.toBeInstanceOf(ConflictException);
      await expect(client.sendMessage(baseConfig, 'e1', 'x')).rejects.toThrow(
        'O relato ainda está sendo enviado ao ePHEM',
      );
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
