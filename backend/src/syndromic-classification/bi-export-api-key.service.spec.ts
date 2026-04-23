import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BiExportApiKeyService } from './bi-export-api-key.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';

describe('BiExportApiKeyService', () => {
  let service: BiExportApiKeyService;
  let keyModel: {
    findMany: jest.Mock;
    create: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  let authz: {
    isAdmin: jest.Mock;
    hasAnyRole: jest.Mock;
  };

  beforeEach(() => {
    keyModel = {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    };
    const prisma = {
      syndrome_bi_export_api_key: keyModel,
    } as unknown as PrismaService;

    authz = {
      isAdmin: jest.fn().mockResolvedValue(false),
      hasAnyRole: jest.fn().mockResolvedValue(true),
    };

    service = new BiExportApiKeyService(prisma, authz as unknown as AuthzService);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-secret' as never);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listForContext', () => {
    it('admin: lista e mapeia campos camelCase', async () => {
      authz.isAdmin.mockResolvedValue(true);
      const created = new Date('2026-04-23T12:00:00.000Z');
      keyModel.findMany.mockResolvedValue([
        {
          public_id: 'uuid-1',
          name: 'k1',
          context_id: 5,
          created_at: created,
          revoked_at: null,
          last_used_at: null,
        },
        {
          public_id: 'uuid-2',
          name: 'k2',
          context_id: 5,
          created_at: created,
          revoked_at: new Date('2026-04-24T00:00:00.000Z'),
          last_used_at: new Date('2026-04-23T15:00:00.000Z'),
        },
      ]);

      const out = await service.listForContext(5, 99);

      expect(authz.hasAnyRole).not.toHaveBeenCalled();
      expect(keyModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { context_id: 5 },
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        }),
      );
      expect(out).toHaveLength(2);
      expect(out[0]).toEqual({
        publicId: 'uuid-1',
        name: 'k1',
        contextId: 5,
        createdAt: created,
        revokedAt: null,
        lastUsedAt: null,
      });
      expect(out[1].revokedAt).toEqual(expect.any(Date));
      expect(out[1].lastUsedAt).toEqual(expect.any(Date));
    });

    it('não-admin sem papel manager: Forbidden', async () => {
      authz.isAdmin.mockResolvedValue(false);
      authz.hasAnyRole.mockResolvedValue(false);

      await expect(service.listForContext(3, 7)).rejects.toThrow(ForbiddenException);
      expect(keyModel.findMany).not.toHaveBeenCalled();
    });

    it('manager do contexto: consulta findMany após hasAnyRole', async () => {
      authz.isAdmin.mockResolvedValue(false);
      authz.hasAnyRole.mockResolvedValue(true);
      keyModel.findMany.mockResolvedValue([]);

      const out = await service.listForContext(8, 3);

      expect(authz.hasAnyRole).toHaveBeenCalledWith(3, 8, ['manager']);
      expect(keyModel.findMany).toHaveBeenCalled();
      expect(out).toEqual([]);
    });
  });

  describe('create', () => {
    it('cria com nome trimado e retorna apiKey no formato publicId.secret', async () => {
      authz.isAdmin.mockResolvedValue(true);
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      keyModel.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        public_id: data.public_id,
        name: data.name,
        context_id: data.context_id,
        created_at: createdAt,
      }));

      const out = await service.create(
        { contextId: 12, name: '  nome  ' },
        42,
      );

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(keyModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            context_id: 12,
            name: 'nome',
            created_by_user_id: 42,
            secret_hash: 'hashed-secret',
          }),
        }),
      );
      expect(out.publicId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(out.name).toBe('nome');
      expect(out.contextId).toBe(12);
      expect(out.apiKey.startsWith(`${out.publicId}.`)).toBe(true);
      expect(out.apiKey.split('.')[1].length).toBeGreaterThanOrEqual(16);
      expect(out.createdAt).toBe(createdAt);
    });

    it('não-admin sem permissão no contexto: Forbidden', async () => {
      authz.isAdmin.mockResolvedValue(false);
      authz.hasAnyRole.mockResolvedValue(false);

      await expect(
        service.create({ contextId: 1, name: 'x' }, 1),
      ).rejects.toThrow(ForbiddenException);
      expect(keyModel.create).not.toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('NotFound quando public_id não existe', async () => {
      keyModel.findUnique.mockResolvedValue(null);

      await expect(
        service.revoke('aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('no-op quando já revogada', async () => {
      keyModel.findUnique.mockResolvedValue({
        context_id: 2,
        revoked_at: new Date(),
      });

      await service.revoke('aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee', 1);

      expect(authz.hasAnyRole).not.toHaveBeenCalled();
      expect(keyModel.update).not.toHaveBeenCalled();
    });

    it('atualiza quando ativa e utilizador pode gerir', async () => {
      keyModel.findUnique.mockResolvedValue({
        context_id: 3,
        revoked_at: null,
      });
      authz.isAdmin.mockResolvedValue(true);

      await service.revoke('aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee', 88);

      expect(keyModel.update).toHaveBeenCalledWith({
        where: { public_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee' },
        data: expect.objectContaining({
          active: false,
          revoked_at: expect.any(Date),
        }),
      });
    });

    it('Forbidden ao revogar sem permissão no contexto', async () => {
      keyModel.findUnique.mockResolvedValue({
        context_id: 9,
        revoked_at: null,
      });
      authz.isAdmin.mockResolvedValue(false);
      authz.hasAnyRole.mockResolvedValue(false);

      await expect(
        service.revoke('aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee', 2),
      ).rejects.toThrow(ForbiddenException);
      expect(keyModel.update).not.toHaveBeenCalled();
    });
  });

  describe('validateApiKeyHeader', () => {
    const validPublic = '550e8400-e29b-41d4-a716-446655440000';
    const validSecret = '1234567890123456';

    it('retorna null para header vazio ou só espaços', async () => {
      expect(await service.validateApiKeyHeader(undefined)).toBeNull();
      expect(await service.validateApiKeyHeader('   ')).toBeNull();
      expect(keyModel.findFirst).not.toHaveBeenCalled();
    });

    it('retorna null para tipo não-string e não-array (ex.: número)', async () => {
      expect(await service.validateApiKeyHeader(42 as unknown as string)).toBeNull();
      expect(keyModel.findFirst).not.toHaveBeenCalled();
    });

    it('array vazio de cabeçalho resulta em string vazia → null', async () => {
      expect(await service.validateApiKeyHeader([] as unknown as string)).toBeNull();
    });

    it('aceita array de cabeçalho (primeiro elemento)', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      keyModel.findFirst.mockResolvedValue({
        secret_hash: 'h',
        context_id: 1,
      });

      const out = await service.validateApiKeyHeader([
        `${validPublic}.${validSecret}`,
      ] as unknown as string);

      expect(out).toEqual({ contextId: 1 });
    });

    it('retorna null sem ponto ou segredo vazio', async () => {
      expect(await service.validateApiKeyHeader('noparts')).toBeNull();
      expect(await service.validateApiKeyHeader(`${validPublic}.`)).toBeNull();
      expect(await service.validateApiKeyHeader(`.${validSecret}`)).toBeNull();
    });

    it('retorna null se publicId não for UUID válido pelo regex', async () => {
      expect(
        await service.validateApiKeyHeader(
          `not-a-uuid.${validSecret}`,
        ),
      ).toBeNull();
    });

    it('retorna null se segredo for curto (< 16)', async () => {
      expect(
        await service.validateApiKeyHeader(`${validPublic}.${'a'.repeat(15)}`),
      ).toBeNull();
    });

    it('retorna null se não existir chave ativa', async () => {
      keyModel.findFirst.mockResolvedValue(null);

      expect(
        await service.validateApiKeyHeader(`${validPublic}.${validSecret}`),
      ).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('retorna null se bcrypt.compare falhar', async () => {
      keyModel.findFirst.mockResolvedValue({
        secret_hash: 'stored',
        context_id: 7,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      expect(
        await service.validateApiKeyHeader(`${validPublic}.${validSecret}`),
      ).toBeNull();
    });

    it('sucesso: retorna contextId e agenda last_used_at', async () => {
      keyModel.findFirst.mockResolvedValue({
        secret_hash: 'stored',
        context_id: 42,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const out = await service.validateApiKeyHeader(
        `${validPublic}.${validSecret}`,
      );

      expect(out).toEqual({ contextId: 42 });
      expect(bcrypt.compare).toHaveBeenCalledWith(validSecret, 'stored');
      expect(keyModel.update).toHaveBeenCalledWith({
        where: { public_id: validPublic },
        data: { last_used_at: expect.any(Date) },
      });
    });

    it('update de last_used_at com falha não propaga erro', async () => {
      keyModel.findFirst.mockResolvedValue({
        secret_hash: 'stored',
        context_id: 1,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      keyModel.update.mockRejectedValueOnce(new Error('db down'));

      const out = await service.validateApiKeyHeader(
        `${validPublic}.${validSecret}`,
      );

      expect(out).toEqual({ contextId: 1 });
    });
  });
});
