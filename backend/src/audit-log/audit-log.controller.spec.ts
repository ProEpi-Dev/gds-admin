import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { RolesGuard } from '../authz/guards/roles.guard';

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let auditLogService: { findAll: jest.Mock };

  beforeEach(async () => {
    auditLogService = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {}, links: {} }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [{ provide: AuditLogService, useValue: auditLogService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<AuditLogController>(AuditLogController);
  });

  it('findAll delega ao serviço', async () => {
    const q = { page: 1, pageSize: 20 } as AuditLogQueryDto;
    await controller.findAll(q);
    expect(auditLogService.findAll).toHaveBeenCalledWith(q);
  });
});
