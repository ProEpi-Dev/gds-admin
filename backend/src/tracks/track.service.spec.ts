import { Test, TestingModule } from '@nestjs/testing';
import { TrackService } from './track.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TrackService', () => {
  let service: TrackService;
  let prismaService: PrismaService;

  const mockTrack = {
    id: 1,
    name: 'Track Teste',
    active: true,
    section: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackService,
        {
          provide: PrismaService,
          useValue: {
            track: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            section: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
            },
            sequence: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TrackService>(TrackService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar uma track', async () => {
      jest
        .spyOn(prismaService.track, 'create')
        .mockResolvedValue(mockTrack as any);

      const result = await service.create({
        name: 'Track Teste',
      });

      expect(result).toEqual(mockTrack);
      expect(prismaService.track.create).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('deve retornar lista de tracks ativas', async () => {
      jest
        .spyOn(prismaService.track, 'findMany')
        .mockResolvedValue([mockTrack] as any);

      const result = await service.list();

      expect(result).toEqual([mockTrack]);
      expect(prismaService.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
        }),
      );
    });
  });

  describe('get', () => {
    it('deve retornar uma track por id', async () => {
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      const result = await service.get(1);

      expect(result).toEqual(mockTrack);
      expect(prismaService.track.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
        }),
      );
    });

    it('deve retornar null se não existir', async () => {
      jest.spyOn(prismaService.track, 'findUnique').mockResolvedValue(null);

      const result = await service.get(999);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('deve desativar a track', async () => {
      jest.spyOn(prismaService.track, 'update').mockResolvedValue({
        ...mockTrack,
        active: false,
      } as any);

      const result = await service.delete(1);

      expect(result.active).toBe(false);
      expect(prismaService.track.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });
  });
});
