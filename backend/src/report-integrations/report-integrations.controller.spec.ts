import { Test, TestingModule } from '@nestjs/testing';
import { ReportIntegrationsController } from './report-integrations.controller';
import { ReportIntegrationsService } from './report-integrations.service';
import { RolesGuard } from '../authz/guards/roles.guard';

describe('ReportIntegrationsController', () => {
  let controller: ReportIntegrationsController;
  let service: any;

  const mockUser = { userId: 1 };
  const mockReq = { headers: {}, ip: '127.0.0.1' } as any;

  beforeEach(async () => {
    service = {
      findEvents: jest.fn().mockResolvedValue({ data: [], meta: {}, links: {} }),
      findEventByReportId: jest.fn().mockResolvedValue(null),
      findEventsByParticipationForUser: jest.fn().mockResolvedValue([]),
      retryIntegration: jest.fn().mockResolvedValue({}),
      syncMessages: jest.fn().mockResolvedValue([]),
      sendMessage: jest.fn().mockResolvedValue({}),
      getConfigByContext: jest.fn().mockResolvedValue(null),
      upsertConfig: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportIntegrationsController],
      providers: [
        { provide: ReportIntegrationsService, useValue: service },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReportIntegrationsController>(
      ReportIntegrationsController,
    );
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('findEvents', () => {
    it('deve chamar service.findEvents com query', async () => {
      const query = { page: 1, pageSize: 10 };
      await controller.findEvents(query);
      expect(service.findEvents).toHaveBeenCalledWith(query);
    });
  });

  describe('findByReport', () => {
    it('deve chamar service.findEventByReportId com utilizador', async () => {
      await controller.findByReport(42, { userId: 9 });
      expect(service.findEventByReportId).toHaveBeenCalledWith(42, 9);
    });
  });

  describe('findByParticipation', () => {
    it('deve chamar service.findEventsByParticipationForUser', async () => {
      await controller.findByParticipation(9, { userId: 1 });
      expect(service.findEventsByParticipationForUser).toHaveBeenCalledWith(
        9,
        1,
      );
    });
  });

  describe('retryIntegration', () => {
    it('deve chamar service.retryIntegration', async () => {
      await controller.retryIntegration(5);
      expect(service.retryIntegration).toHaveBeenCalledWith(5);
    });
  });

  describe('getMessages', () => {
    it('deve chamar service.syncMessages com utilizador', async () => {
      await controller.getMessages(7, { userId: 3 });
      expect(service.syncMessages).toHaveBeenCalledWith(7, 3);
    });
  });

  describe('sendMessage', () => {
    it('deve chamar service.sendMessage com utilizador', async () => {
      await controller.sendMessage(7, { message: 'hello' }, { userId: 3 });
      expect(service.sendMessage).toHaveBeenCalledWith(7, 'hello', 3);
    });
  });

  describe('getConfig', () => {
    it('deve chamar service.getConfigByContext', async () => {
      await controller.getConfig(3);
      expect(service.getConfigByContext).toHaveBeenCalledWith(3);
    });
  });

  describe('upsertConfig', () => {
    it('deve chamar service.upsertConfig', async () => {
      const dto = { maxRetries: 3 };
      await controller.upsertConfig(3, dto as any, mockUser, mockReq);
      expect(service.upsertConfig).toHaveBeenCalledWith(
        3,
        dto,
        1,
        expect.any(Object),
      );
    });
  });
});
