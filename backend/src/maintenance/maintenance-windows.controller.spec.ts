import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { MaintenanceWindowsController } from './maintenance-windows.controller';
import { MaintenanceWindowsService } from './maintenance-windows.service';
import {
  CreateMaintenanceWindowDto,
  MaintenanceWindowQueryDto,
  UpdateMaintenanceWindowDto,
} from './dto/maintenance-window.dto';
import { RolesGuard } from '../authz/guards/roles.guard';

describe('MaintenanceWindowsController', () => {
  let controller: MaintenanceWindowsController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user = { userId: 7 };
  const req = { headers: {}, ip: '10.0.0.1' } as unknown as Request;

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {}, links: {} }),
      findOne: jest.fn().mockResolvedValue({ id: 1 }),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1 }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceWindowsController],
      providers: [{ provide: MaintenanceWindowsService, useValue: service }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(MaintenanceWindowsController);
  });

  it('findAll delega ao serviço', async () => {
    const query = { page: 1, pageSize: 20 } as MaintenanceWindowQueryDto;

    await controller.findAll(query);

    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('findOne delega ao serviço', async () => {
    await controller.findOne(5);

    expect(service.findOne).toHaveBeenCalledWith(5);
  });

  it('create repassa autor e contexto da requisição para a auditoria', async () => {
    const dto = { mode: 'full' } as CreateMaintenanceWindowDto;

    await controller.create(dto, user, req);

    expect(service.create).toHaveBeenCalledWith(
      dto,
      7,
      expect.objectContaining({ ipAddress: expect.anything() }),
    );
  });

  it('update repassa id, autor e contexto da requisição', async () => {
    const dto = { active: false } as UpdateMaintenanceWindowDto;

    await controller.update(5, dto, user, req);

    expect(service.update).toHaveBeenCalledWith(
      5,
      dto,
      7,
      expect.objectContaining({ ipAddress: expect.anything() }),
    );
  });

  it('remove repassa id, autor e contexto da requisição', async () => {
    await controller.remove(5, user, req);

    expect(service.remove).toHaveBeenCalledWith(
      5,
      7,
      expect.objectContaining({ ipAddress: expect.anything() }),
    );
  });
});
