import { Test, TestingModule } from '@nestjs/testing';
import { BiExportApiKeyController } from './bi-export-api-key.controller';
import { BiExportApiKeyService } from './bi-export-api-key.service';
import { RolesGuard } from '../authz/guards/roles.guard';

describe('BiExportApiKeyController', () => {
  let controller: BiExportApiKeyController;
  let service: jest.Mocked<
    Pick<
      BiExportApiKeyService,
      'listForContext' | 'create' | 'revoke'
    >
  >;

  beforeEach(async () => {
    const mockService = {
      listForContext: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BiExportApiKeyController],
      providers: [{ provide: BiExportApiKeyService, useValue: mockService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(BiExportApiKeyController);
    service = module.get(BiExportApiKeyService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('delega a listForContext com contextId e userId', async () => {
      const rows = [
        {
          publicId: 'p1',
          name: 'n',
          contextId: 3,
          createdAt: new Date(),
          revokedAt: null,
          lastUsedAt: null,
        },
      ];
      service.listForContext.mockResolvedValue(rows as any);

      const result = await controller.list(
        { contextId: 3 } as any,
        { userId: 100 },
      );

      expect(service.listForContext).toHaveBeenCalledWith(3, 100);
      expect(result).toBe(rows);
    });
  });

  describe('create', () => {
    it('delega a create com dto e userId', async () => {
      const dto = { contextId: 2, name: 'Chave BI' };
      const created = {
        apiKey: 'uuid.secret',
        publicId: 'uuid',
        name: 'Chave BI',
        contextId: 2,
        createdAt: new Date(),
      };
      service.create.mockResolvedValue(created as any);

      const result = await controller.create(dto as any, { userId: 5 });

      expect(service.create).toHaveBeenCalledWith(dto, 5);
      expect(result).toBe(created);
    });
  });

  describe('revoke', () => {
    it('delega a revoke e retorna void', async () => {
      service.revoke.mockResolvedValue(undefined);

      await controller.revoke(
        'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
        { userId: 9 },
      );

      expect(service.revoke).toHaveBeenCalledWith(
        'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
        9,
      );
    });
  });
});
