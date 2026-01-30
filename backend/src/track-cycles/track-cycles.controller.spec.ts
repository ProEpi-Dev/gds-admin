import { Test, TestingModule } from '@nestjs/testing';
import { TrackCyclesController } from './track-cycles.controller';
import { TrackCyclesService } from './track-cycles.service';

describe('TrackCyclesController', () => {
  let controller: TrackCyclesController;
  let service: jest.Mocked<TrackCyclesService>;

  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findOne: jest.fn(),
    getStudentsProgress: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackCyclesController],
      providers: [
        {
          provide: TrackCyclesService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<TrackCyclesController>(TrackCyclesController);
    service = module.get(TrackCyclesService) as jest.Mocked<TrackCyclesService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create()', async () => {
    service.create.mockResolvedValue({ id: 1 } as any);

    const dto: any = { name: 'Cycle 1' };
    const result = await controller.create(dto);

    expect(result).toEqual({ id: 1 });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll()', async () => {
    service.findAll.mockResolvedValue([]);

    const query: any = {};
    const result = await controller.findAll(query);

    expect(result).toEqual([]);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('findActive()', async () => {
    service.findActive.mockResolvedValue([]);

    const result = await controller.findActive(1, 2);

    expect(result).toEqual([]);
    expect(service.findActive).toHaveBeenCalledWith(1, 2);
  });

  it('findOne()', async () => {
    service.findOne.mockResolvedValue({ id: 1 } as any);

    const result = await controller.findOne(1);

    expect(result).toEqual({ id: 1 });
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('getStudentsProgress()', async () => {
    service.getStudentsProgress.mockResolvedValue([]);

    const result = await controller.getStudentsProgress(1);

    expect(result).toEqual([]);
    expect(service.getStudentsProgress).toHaveBeenCalledWith(1);
  });

  it('update()', async () => {
    service.update.mockResolvedValue({ id: 1 } as any);

    const result = await controller.update(1, { name: 'Novo' } as any);

    expect(result).toEqual({ id: 1 });
    expect(service.update).toHaveBeenCalledWith(1, { name: 'Novo' });
  });

  it('updateStatus()', async () => {
    service.updateStatus.mockResolvedValue({ id: 1 } as any);

    const result = await controller.updateStatus(1, {
      status: 'active',
    } as any);

    expect(result).toEqual({ id: 1 });
    expect(service.updateStatus).toHaveBeenCalledWith(1, { status: 'active' });
  });

  it('remove()', async () => {
    service.remove.mockResolvedValue({ id: 1 } as any);

    const result = await controller.remove(1);

    expect(result).toEqual({ id: 1 });
    expect(service.remove).toHaveBeenCalledWith(1);
  });
});
