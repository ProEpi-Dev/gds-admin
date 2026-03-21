import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: PrismaService;

  const mockRoles = [
    {
      id: 1,
      code: 'admin',
      name: 'Administrador',
      description: 'Acesso total',
      scope: 'global',
      active: true,
    },
    {
      id: 2,
      code: 'manager',
      name: 'Gerente',
      description: 'Gerencia contexto',
      scope: 'context',
      active: true,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: PrismaService,
          useValue: {
            role: { findMany: jest.fn(), findUnique: jest.fn() },
            permission: { findMany: jest.fn() },
            role_permission: {
              findMany: jest.fn(),
              deleteMany: jest.fn(),
              createMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar todos os papéis ativos mapeados para DTO', async () => {
      (prisma.role.findMany as jest.Mock).mockResolvedValue(mockRoles);

      const result = await service.findAll();

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { id: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        code: 'admin',
        name: 'Administrador',
        description: 'Acesso total',
        scope: 'global',
        active: true,
      });
      expect(result[1]).toEqual({
        id: 2,
        code: 'manager',
        name: 'Gerente',
        description: 'Gerencia contexto',
        scope: 'context',
        active: true,
      });
    });

    it('deve mapear description e scope null quando não definidos', async () => {
      (prisma.role.findMany as jest.Mock).mockResolvedValue([
        {
          id: 3,
          code: 'participant',
          name: 'Participante',
          description: null,
          scope: null,
          active: true,
        },
      ]);

      const result = await service.findAll();

      expect(result[0]).toEqual({
        id: 3,
        code: 'participant',
        name: 'Participante',
        description: null,
        scope: null,
        active: true,
      });
    });
  });

  describe('findAllPermissions', () => {
    it('deve listar permissões ativas ordenadas por código', async () => {
      const perms = [
        {
          id: 1,
          code: 'content:read',
          name: 'Ler',
          description: null,
          active: true,
        },
      ];
      (prisma.permission.findMany as jest.Mock).mockResolvedValue(perms);

      const result = await service.findAllPermissions();

      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { code: 'asc' },
      });
      expect(result[0].code).toBe('content:read');
    });
  });

  describe('getRolePermissions', () => {
    it('deve lançar NotFound quando papel não existe', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getRolePermissions(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve retornar permissões do papel', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRoles[1]);
      (prisma.role_permission.findMany as jest.Mock).mockResolvedValue([
        {
          permission: {
            id: 5,
            code: 'content:write',
            name: 'Escrever',
            description: null,
            active: true,
          },
        },
      ]);

      const result = await service.getRolePermissions(2);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('content:write');
    });
  });

  describe('setRolePermissions', () => {
    it('deve lançar NotFound quando papel não existe', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.setRolePermissions(1, [])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequest quando id de permissão inválido', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRoles[1]);
      (prisma.permission.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.setRolePermissions(2, [1, 2])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve atualizar vínculos em transação', async () => {
      const deleteManyTx = jest.fn().mockResolvedValue({ count: 1 });
      const createManyTx = jest.fn().mockResolvedValue({ count: 1 });
      (prisma as unknown as { $transaction: jest.Mock }).$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            role_permission: {
              deleteMany: deleteManyTx,
              createMany: createManyTx,
            },
          }),
      );
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRoles[1]);
      (prisma.permission.findMany as jest.Mock).mockResolvedValue([
        { id: 1, code: 'a', name: 'A', description: null, active: true },
      ]);
      (prisma.role_permission.findMany as jest.Mock).mockResolvedValue([
        {
          permission: {
            id: 1,
            code: 'a',
            name: 'A',
            description: null,
            active: true,
          },
        },
      ]);

      const result = await service.setRolePermissions(2, [1]);

      expect(result).toHaveLength(1);
      expect(deleteManyTx).toHaveBeenCalled();
      expect(createManyTx).toHaveBeenCalled();
    });
  });
});
