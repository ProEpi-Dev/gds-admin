import { Test, TestingModule } from '@nestjs/testing';
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
            role: { findMany: jest.fn() },
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
});
