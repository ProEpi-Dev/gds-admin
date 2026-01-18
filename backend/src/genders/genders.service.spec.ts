import { Test, TestingModule } from '@nestjs/testing';
import { GendersService } from './genders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GendersService', () => {
  let service: GendersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    gender: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GendersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GendersService>(GendersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve retornar todos os gêneros ativos', async () => {
      const mockGenders = [
        {
          id: 1,
          name: 'Masculino',
          active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
        {
          id: 2,
          name: 'Feminino',
          active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
      ];

      mockPrismaService.gender.findMany.mockResolvedValue(mockGenders);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Masculino');
      expect(result[1].name).toBe('Feminino');
      expect(mockPrismaService.gender.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
    });

    it('deve retornar array vazio quando não há gêneros', async () => {
      mockPrismaService.gender.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });

    it('deve mapear todos os campos corretamente', async () => {
      const mockGenders = [
        {
          id: 1,
          name: 'Masculino',
          active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
      ];

      mockPrismaService.gender.findMany.mockResolvedValue(mockGenders);

      const result = await service.findAll();

      expect(result[0]).toEqual({
        id: 1,
        name: 'Masculino',
        active: true,
        createdAt: mockGenders[0].created_at,
        updatedAt: mockGenders[0].updated_at,
      });
    });
  });
});
