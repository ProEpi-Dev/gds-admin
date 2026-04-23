import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { SyndromicClassificationController } from './syndromic-classification.controller';
import { SyndromicClassificationService } from './syndromic-classification.service';
import { RolesGuard } from '../authz/guards/roles.guard';
import { BiExportApiKeyGuard } from './bi-export-api-key.guard';

describe('SyndromicClassificationController', () => {
  let controller: SyndromicClassificationController;
  const service = {
    getDailySyndromeCounts: jest.fn(),
    listReportScores: jest.fn(),
    reprocessReports: jest.fn(),
    listSymptoms: jest.fn(),
    createSymptom: jest.fn(),
    updateSymptom: jest.fn(),
    removeSymptom: jest.fn(),
    listSyndromes: jest.fn(),
    createSyndrome: jest.fn(),
    updateSyndrome: jest.fn(),
    removeSyndrome: jest.fn(),
    listWeights: jest.fn(),
    createWeight: jest.fn(),
    updateWeight: jest.fn(),
    removeWeight: jest.fn(),
    getWeightMatrix: jest.fn(),
    upsertWeightMatrix: jest.fn(),
    listFormConfigs: jest.fn(),
    createFormConfig: jest.fn(),
    updateFormConfig: jest.fn(),
    removeFormConfig: jest.fn(),
    listFormSymptomMappings: jest.fn(),
    createFormSymptomMapping: jest.fn(),
    updateFormSymptomMapping: jest.fn(),
    removeFormSymptomMapping: jest.fn(),
  };

  const req = {
    ip: '127.0.0.1',
    headers: {},
  } as unknown as Request;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyndromicClassificationController],
      providers: [
        {
          provide: SyndromicClassificationService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .overrideGuard(BiExportApiKeyGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(SyndromicClassificationController);
  });

  it('getDailySyndromeCounts delega ao service', async () => {
    const payload = { labels: [], series: [], totalsBySyndrome: [] };
    service.getDailySyndromeCounts.mockResolvedValue(payload as any);

    const query = {
      startDate: '2026-01-01',
      endDate: '2026-01-07',
    } as any;
    const result = await controller.getDailySyndromeCounts(query, { userId: 3 });

    expect(service.getDailySyndromeCounts).toHaveBeenCalledWith(query, 3);
    expect(result).toBe(payload);
  });

  it('listReportScores delega ao service', async () => {
    const payload = { data: [], meta: {}, links: {} };
    service.listReportScores.mockResolvedValue(payload as any);

    const query = { page: 1, pageSize: 20 } as any;
    const result = await controller.listReportScores(query, { userId: 4 });

    expect(service.listReportScores).toHaveBeenCalledWith(query, 4);
    expect(result).toBe(payload);
  });

  it('reprocess delega ao service com contexto de auditoria', async () => {
    const dto = { limit: 10 } as any;
    const out = { jobLikeId: 'x', requestedCount: 0 } as any;
    service.reprocessReports.mockResolvedValue(out);

    const result = await controller.reprocess(dto, { userId: 1 }, req);

    expect(result).toBe(out);
    expect(service.reprocessReports).toHaveBeenCalledWith(
      dto,
      1,
      expect.objectContaining({
        channel: expect.any(String),
        ipAddress: '127.0.0.1',
      }),
    );
  });

  it('listSymptoms delega ao service', async () => {
    service.listSymptoms.mockResolvedValue([{ id: 1 }]);

    await expect(controller.listSymptoms()).resolves.toEqual([{ id: 1 }]);
    expect(service.listSymptoms).toHaveBeenCalled();
  });

  it('createSymptom delega ao service', async () => {
    const dto = { code: 'c', name: 'N' } as any;
    service.createSymptom.mockResolvedValue({ id: 9 });

    const result = await controller.createSymptom(dto, { userId: 2 }, req);

    expect(result).toEqual({ id: 9 });
    expect(service.createSymptom).toHaveBeenCalledWith(
      dto,
      2,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('listSyndromes delega ao service', async () => {
    service.listSyndromes.mockResolvedValue([]);

    await controller.listSyndromes();

    expect(service.listSyndromes).toHaveBeenCalled();
  });

  it('getWeightMatrix delega ao service', async () => {
    service.getWeightMatrix.mockResolvedValue({ rows: [] });

    await controller.getWeightMatrix();

    expect(service.getWeightMatrix).toHaveBeenCalled();
  });

  it('updateSymptom delega ao service', async () => {
    const dto = { name: 'x' } as any;
    service.updateSymptom.mockResolvedValue({ id: 1 });

    await expect(
      controller.updateSymptom(1, dto, { userId: 5 }, req),
    ).resolves.toEqual({ id: 1 });
    expect(service.updateSymptom).toHaveBeenCalledWith(
      1,
      dto,
      5,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('removeSymptom delega ao service', async () => {
    service.removeSymptom.mockResolvedValue(undefined);

    await controller.removeSymptom(2, { userId: 6 }, req);

    expect(service.removeSymptom).toHaveBeenCalledWith(
      2,
      6,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('createSyndrome delega ao service', async () => {
    const dto = { code: 's' } as any;
    service.createSyndrome.mockResolvedValue({ id: 3 });

    await expect(controller.createSyndrome(dto, { userId: 7 }, req)).resolves.toEqual({
      id: 3,
    });
    expect(service.createSyndrome).toHaveBeenCalledWith(
      dto,
      7,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('updateSyndrome delega ao service', async () => {
    const dto = { name: 'y' } as any;
    service.updateSyndrome.mockResolvedValue({ id: 4 });

    await controller.updateSyndrome(4, dto, { userId: 8 }, req);

    expect(service.updateSyndrome).toHaveBeenCalledWith(
      4,
      dto,
      8,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('removeSyndrome delega ao service', async () => {
    service.removeSyndrome.mockResolvedValue(undefined);

    await controller.removeSyndrome(5, { userId: 9 }, req);

    expect(service.removeSyndrome).toHaveBeenCalledWith(
      5,
      9,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('listWeights delega ao service', async () => {
    service.listWeights.mockResolvedValue([]);

    await controller.listWeights();

    expect(service.listWeights).toHaveBeenCalled();
  });

  it('createWeight delega ao service', async () => {
    const dto = { syndromeId: 1, symptomId: 2, weight: 1 } as any;
    service.createWeight.mockResolvedValue({ id: 10 });

    await controller.createWeight(dto, { userId: 10 }, req);

    expect(service.createWeight).toHaveBeenCalledWith(
      dto,
      10,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('updateWeight delega ao service', async () => {
    const dto = { weight: 2 } as any;
    service.updateWeight.mockResolvedValue({ id: 11 });

    await controller.updateWeight(11, dto, { userId: 11 }, req);

    expect(service.updateWeight).toHaveBeenCalledWith(
      11,
      dto,
      11,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('removeWeight delega ao service', async () => {
    service.removeWeight.mockResolvedValue(undefined);

    await controller.removeWeight(12, { userId: 12 }, req);

    expect(service.removeWeight).toHaveBeenCalledWith(
      12,
      12,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('upsertWeightMatrix delega ao service', async () => {
    const dto = { rows: [] } as any;
    service.upsertWeightMatrix.mockResolvedValue({ ok: true });

    await controller.upsertWeightMatrix(dto, { userId: 13 }, req);

    expect(service.upsertWeightMatrix).toHaveBeenCalledWith(
      dto,
      13,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('listFormConfigs delega ao service', async () => {
    service.listFormConfigs.mockResolvedValue([]);

    await controller.listFormConfigs();

    expect(service.listFormConfigs).toHaveBeenCalled();
  });

  it('createFormConfig delega ao service', async () => {
    const dto = { formVersionId: 1 } as any;
    service.createFormConfig.mockResolvedValue({ id: 20 });

    await controller.createFormConfig(dto, { userId: 14 }, req);

    expect(service.createFormConfig).toHaveBeenCalledWith(
      dto,
      14,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('updateFormConfig delega ao service', async () => {
    const dto = { active: true } as any;
    service.updateFormConfig.mockResolvedValue({ id: 21 });

    await controller.updateFormConfig(21, dto, { userId: 15 }, req);

    expect(service.updateFormConfig).toHaveBeenCalledWith(
      21,
      dto,
      15,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('removeFormConfig delega ao service', async () => {
    service.removeFormConfig.mockResolvedValue(undefined);

    await controller.removeFormConfig(22, { userId: 16 }, req);

    expect(service.removeFormConfig).toHaveBeenCalledWith(
      22,
      16,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('listFormSymptomMappings delega ao service', async () => {
    service.listFormSymptomMappings.mockResolvedValue([]);

    await controller.listFormSymptomMappings();

    expect(service.listFormSymptomMappings).toHaveBeenCalled();
  });

  it('createFormSymptomMapping delega ao service', async () => {
    const dto = { symptomId: 1 } as any;
    service.createFormSymptomMapping.mockResolvedValue({ id: 30 });

    await controller.createFormSymptomMapping(dto, { userId: 17 }, req);

    expect(service.createFormSymptomMapping).toHaveBeenCalledWith(
      dto,
      17,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('updateFormSymptomMapping delega ao service', async () => {
    const dto = { fieldKey: 'f' } as any;
    service.updateFormSymptomMapping.mockResolvedValue({ id: 31 });

    await controller.updateFormSymptomMapping(31, dto, { userId: 18 }, req);

    expect(service.updateFormSymptomMapping).toHaveBeenCalledWith(
      31,
      dto,
      18,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });

  it('removeFormSymptomMapping delega ao service', async () => {
    service.removeFormSymptomMapping.mockResolvedValue(undefined);

    await controller.removeFormSymptomMapping(32, { userId: 19 }, req);

    expect(service.removeFormSymptomMapping).toHaveBeenCalledWith(
      32,
      19,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
  });
});
