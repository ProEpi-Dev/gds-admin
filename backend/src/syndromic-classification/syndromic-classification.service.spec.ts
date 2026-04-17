import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SyndromicClassificationService } from './syndromic-classification.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { BusinessMetricsService } from '../telemetry/business-metrics.service';
import { report_type_enum } from '@prisma/client';
import { ReportSyndromeScoresQueryDto } from './dto/syndromic-classification.dto';

describe('SyndromicClassificationService', () => {
  let service: SyndromicClassificationService;
  let prisma: any;
  let configGet: jest.Mock;
  const auditRecord = jest.fn().mockResolvedValue(undefined);
  const metrics = {
    recordSyndromeClassification: jest.fn(),
    recordSyndromeClassificationDuration: jest.fn(),
    recordSyndromeScoreGenerated: jest.fn(),
  };
  let authz: jest.Mocked<
    Pick<
      AuthzService,
      'resolveListContextId' | 'isAdmin' | 'getManagedContextIds'
    >
  >;

  beforeEach(async () => {
    prisma = {
      report: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };
    prisma.report_syndrome_score = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    };
    prisma.symptom = {
      findMany: jest.fn().mockResolvedValue([{ id: 1, code: 'fever', name: 'Febre' }]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    prisma.syndrome = {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    prisma.syndrome_symptom_weight = {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    prisma.syndrome_form_config = {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    prisma.form_symptom_mapping = {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    prisma.$transaction = jest.fn(async (cb: (tx: any) => Promise<unknown>) =>
      cb({
        syndrome_symptom_weight: {
          upsert: jest.fn().mockResolvedValue({}),
        },
        report_syndrome_score: {
          deleteMany: jest.fn().mockResolvedValue({}),
          createMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({}),
        },
      }),
    );

    authz = {
      resolveListContextId: jest.fn().mockResolvedValue(10),
      isAdmin: jest.fn().mockResolvedValue(false),
      getManagedContextIds: jest.fn().mockResolvedValue([]),
    };

    configGet = jest.fn().mockImplementation((key: string) => {
      if (key === 'SYNDROMIC_CLASSIFICATION_REPORT_TYPE') {
        return undefined;
      }
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyndromicClassificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthzService, useValue: authz },
        {
          provide: AuditLogService,
          useValue: { record: auditRecord },
        },
        {
          provide: BusinessMetricsService,
          useValue: metrics,
        },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get(SyndromicClassificationService);
    auditRecord.mockClear();
    jest.clearAllMocks();
    metrics.recordSyndromeClassification.mockClear();
    metrics.recordSyndromeClassificationDuration.mockClear();
    metrics.recordSyndromeScoreGenerated.mockClear();
  });

  describe('classifyReport', () => {
    it('avisa e retorna quando report não existe', async () => {
      prisma.report.findUnique.mockResolvedValue(null);
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      await service.classifyReport(999);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('persiste snapshot skipped quando report não é do tipo elegível (padrão NEGATIVE)', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 7,
        report_type: report_type_enum.POSITIVE,
        form_version: { id: 1, form_id: 10 },
        form_response: {},
      });
      await service.classifyReport(7);
      expect(metrics.recordSyndromeClassification).toHaveBeenCalledWith('skipped');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('com SYNDROMIC_CLASSIFICATION_REPORT_TYPE=NEGATIVE, POSITIVE é ignorado', async () => {
      configGet.mockImplementation((key: string) =>
        key === 'SYNDROMIC_CLASSIFICATION_REPORT_TYPE' ? 'NEGATIVE' : undefined,
      );
      prisma.report.findUnique.mockResolvedValue({
        id: 71,
        report_type: report_type_enum.POSITIVE,
        form_version: { id: 1, form_id: 10 },
        form_response: {},
      });
      await service.classifyReport(71);
      expect(metrics.recordSyndromeClassification).toHaveBeenCalledWith('skipped');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('com SYNDROMIC_CLASSIFICATION_REPORT_TYPE=NEGATIVE, NEGATIVE segue fluxo com config', async () => {
      configGet.mockImplementation((key: string) =>
        key === 'SYNDROMIC_CLASSIFICATION_REPORT_TYPE' ? 'NEGATIVE' : undefined,
      );
      prisma.report.findUnique.mockResolvedValue({
        id: 72,
        report_type: report_type_enum.NEGATIVE,
        form_version: { id: 5, form_id: 99 },
        form_response: { sintomas: ['febre', 'tosse'] },
      });
      prisma.syndrome_form_config.findFirst.mockResolvedValue({
        id: 1,
        symptoms_field_name: 'sintomas',
        symptoms_field_id: null,
        symptom_onset_date_field_name: null,
        symptom_onset_date_field_id: null,
      });
      prisma.form_symptom_mapping.findMany.mockResolvedValue([]);
      prisma.symptom.findMany.mockResolvedValue([
        { id: 1, code: 'febre' },
        { id: 2, code: 'tosse' },
      ]);
      prisma.syndrome.findMany.mockResolvedValue([
        { id: 10, code: 'S', name: 'S', threshold_score: 0.2, active: true },
      ]);
      prisma.syndrome_symptom_weight.findMany.mockResolvedValue([
        { syndrome_id: 10, symptom_id: 1, weight: 0.6, active: true },
        { syndrome_id: 10, symptom_id: 2, weight: 0.4, active: true },
      ]);

      await service.classifyReport(72);

      expect(metrics.recordSyndromeClassification).toHaveBeenCalledWith('processed');
    });

    it('sem config ativa: apaga scores e métrica skipped', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 8,
        report_type: report_type_enum.NEGATIVE,
        form_version: { id: 1, form_id: 10 },
        form_response: {},
      });
      prisma.syndrome_form_config.findFirst.mockResolvedValue(null);
      await service.classifyReport(8);
      expect(prisma.report_syndrome_score.deleteMany).toHaveBeenCalledWith({
        where: { report_id: 8 },
      });
      expect(metrics.recordSyndromeClassification).toHaveBeenCalledWith('skipped');
    });

    it('fluxo do tipo elegível com config: grava scores e métricas processed', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 20,
        report_type: report_type_enum.NEGATIVE,
        form_version: { id: 5, form_id: 99 },
        form_response: { sintomas: ['febre', 'tosse'] },
      });
      prisma.syndrome_form_config.findFirst.mockResolvedValue({
        id: 1,
        symptoms_field_name: 'sintomas',
        symptoms_field_id: null,
        symptom_onset_date_field_name: null,
        symptom_onset_date_field_id: null,
      });
      prisma.form_symptom_mapping.findMany.mockResolvedValue([]);
      prisma.symptom.findMany.mockResolvedValue([
        { id: 1, code: 'febre' },
        { id: 2, code: 'tosse' },
      ]);
      prisma.syndrome.findMany.mockResolvedValue([
        { id: 10, code: 'S', name: 'S', threshold_score: 0.2, active: true },
      ]);
      prisma.syndrome_symptom_weight.findMany.mockResolvedValue([
        { syndrome_id: 10, symptom_id: 1, weight: 0.6, active: true },
        { syndrome_id: 10, symptom_id: 2, weight: 0.4, active: true },
      ]);

      await service.classifyReport(20);

      expect(metrics.recordSyndromeClassification).toHaveBeenCalledWith('processed');
      expect(metrics.recordSyndromeClassificationDuration).toHaveBeenCalled();
      expect(metrics.recordSyndromeScoreGenerated).toHaveBeenCalled();
    });

    it('valor de sintoma como objeto é serializado para mapeamento', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 23,
        report_type: report_type_enum.NEGATIVE,
        form_version: { id: 5, form_id: 99 },
        form_response: { sintomas: { codigo: 'febre' } },
      });
      prisma.syndrome_form_config.findFirst.mockResolvedValue({
        id: 1,
        symptoms_field_name: 'sintomas',
        symptoms_field_id: null,
        symptom_onset_date_field_name: null,
        symptom_onset_date_field_id: null,
      });
      prisma.form_symptom_mapping.findMany.mockResolvedValue([]);
      prisma.symptom.findMany.mockResolvedValue([]);
      prisma.syndrome.findMany.mockResolvedValue([]);
      prisma.syndrome_symptom_weight.findMany.mockResolvedValue([]);

      await service.classifyReport(23);

      expect(metrics.recordSyndromeClassification).toHaveBeenCalled();
    });

    it('valor de sintoma escalar numérico é convertido para string', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 24,
        report_type: report_type_enum.NEGATIVE,
        form_version: { id: 5, form_id: 99 },
        form_response: { sintomas: 42 },
      });
      prisma.syndrome_form_config.findFirst.mockResolvedValue({
        id: 1,
        symptoms_field_name: 'sintomas',
        symptoms_field_id: null,
        symptom_onset_date_field_name: null,
        symptom_onset_date_field_id: null,
      });
      prisma.form_symptom_mapping.findMany.mockResolvedValue([]);
      prisma.symptom.findMany.mockResolvedValue([]);
      prisma.syndrome.findMany.mockResolvedValue([]);
      prisma.syndrome_symptom_weight.findMany.mockResolvedValue([]);

      await service.classifyReport(24);

      expect(metrics.recordSyndromeClassification).toHaveBeenCalled();
    });

    it('sem síndromes ativas: grava linha skipped dentro da transação', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 22,
        report_type: report_type_enum.NEGATIVE,
        form_version: { id: 5, form_id: 99 },
        form_response: { sintomas: ['febre'] },
      });
      prisma.syndrome_form_config.findFirst.mockResolvedValue({
        id: 1,
        symptoms_field_name: 'sintomas',
        symptoms_field_id: null,
        symptom_onset_date_field_name: null,
        symptom_onset_date_field_id: null,
      });
      prisma.form_symptom_mapping.findMany.mockResolvedValue([]);
      prisma.symptom.findMany.mockResolvedValue([{ id: 1, code: 'febre' }]);
      prisma.syndrome.findMany.mockResolvedValue([]);
      prisma.syndrome_symptom_weight.findMany.mockResolvedValue([]);

      await service.classifyReport(22);

      expect(metrics.recordSyndromeClassification).toHaveBeenCalledWith('processed');
    });

    it('em erro no cálculo: snapshot failed e métrica failed', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 21,
        report_type: report_type_enum.NEGATIVE,
        form_version: { id: 5, form_id: 99 },
        form_response: { sintomas: ['x'] },
      });
      prisma.syndrome_form_config.findFirst.mockResolvedValue({
        id: 1,
        symptoms_field_name: 'sintomas',
        symptoms_field_id: null,
        symptom_onset_date_field_name: null,
        symptom_onset_date_field_id: null,
      });
      prisma.form_symptom_mapping.findMany.mockRejectedValue(
        new Error('falha de mapping'),
      );

      const errSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      await service.classifyReport(21);

      expect(metrics.recordSyndromeClassification).toHaveBeenCalledWith('failed');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe('listReportScores', () => {
    it('retorna lista paginada com occurrenceLocation', async () => {
      const row = {
        id: 5,
        report_id: 100,
        syndrome_id: 2,
        score: 0.33,
        threshold_score_snapshot: 0.27,
        is_above_threshold: true,
        processing_status: 'processed',
        processing_error: null,
        processed_at: new Date('2026-04-01T12:00:00.000Z'),
        syndrome: { code: 'd', name: 'Diarreica' },
        report: {
          occurrence_location: { latitude: -23.5, longitude: -46.6 },
        },
      };
      prisma.report_syndrome_score.findMany.mockResolvedValue([row]);
      prisma.report_syndrome_score.count.mockResolvedValue(1);

      const query: ReportSyndromeScoresQueryDto = {
        page: 1,
        pageSize: 20,
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        isAboveThreshold: true,
        processingStatus: 'processed',
        syndromeId: 2,
        onlyLatest: true,
      };

      const result = await service.listReportScores(query, 7);

      expect(authz.resolveListContextId).toHaveBeenCalled();
      const findArgs = prisma.report_syndrome_score.findMany.mock.calls[0][0];
      expect(findArgs.where.is_latest).toBe(true);
      expect(findArgs.where.syndrome_id).toBe(2);
      expect(findArgs.where.processing_status).toBe('processed');
      expect(findArgs.where.is_above_threshold).toBe(true);
      expect(findArgs.where.report.participation.context_id).toBe(10);
      expect(findArgs.where.report.created_at.gte).toBeInstanceOf(Date);
      expect(findArgs.where.report.created_at.lte).toBeInstanceOf(Date);
      expect(findArgs.skip).toBe(0);
      expect(findArgs.take).toBe(20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].reportId).toBe(100);
      expect(result.data[0].occurrenceLocation).toEqual({
        latitude: -23.5,
        longitude: -46.6,
      });
      expect(result.meta.totalItems).toBe(1);
    });

    it('aplica onlyLatest false e reportId', async () => {
      prisma.report_syndrome_score.findMany.mockResolvedValue([]);
      prisma.report_syndrome_score.count.mockResolvedValue(0);

      await service.listReportScores(
        {
          page: 2,
          pageSize: 10,
          reportId: 55,
          onlyLatest: false,
        } as ReportSyndromeScoresQueryDto,
        1,
      );

      const findArgs = prisma.report_syndrome_score.findMany.mock.calls[0][0];
      expect(findArgs.where.report_id).toBe(55);
      expect(findArgs.where).not.toHaveProperty('is_latest');
      expect(findArgs.skip).toBe(10);
      expect(findArgs.take).toBe(10);
    });

    it('filtra só por startDate quando endDate omitido', async () => {
      prisma.report_syndrome_score.findMany.mockResolvedValue([]);
      prisma.report_syndrome_score.count.mockResolvedValue(0);

      await service.listReportScores(
        { page: 1, pageSize: 20, startDate: '2026-01-10' } as ReportSyndromeScoresQueryDto,
        1,
      );

      const call = prisma.report_syndrome_score.findMany.mock.calls[0][0];
      expect(call.where.report.created_at.gte).toBeInstanceOf(Date);
      expect(call.where.report.created_at.lte).toBeUndefined();
    });

    it('filtra só por endDate quando startDate omitido', async () => {
      prisma.report_syndrome_score.findMany.mockResolvedValue([]);
      prisma.report_syndrome_score.count.mockResolvedValue(0);

      await service.listReportScores(
        { page: 1, pageSize: 20, endDate: '2026-01-20' } as ReportSyndromeScoresQueryDto,
        1,
      );

      const call = prisma.report_syndrome_score.findMany.mock.calls[0][0];
      expect(call.where.report.created_at.lte).toBeInstanceOf(Date);
      expect(call.where.report.created_at.gte).toBeUndefined();
    });
  });

  describe('getDailySyndromeCounts', () => {
    it('lança BadRequest quando startDate > endDate', async () => {
      await expect(
        service.getDailySyndromeCounts(
          {
            startDate: '2026-04-20',
            endDate: '2026-04-01',
          } as any,
          1,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('monta série a partir do retorno do SQL', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          report_day: new Date('2026-01-01T12:00:00.000Z'),
          syndrome_id: 1,
          syndrome_name: 'A',
          total: 4,
        },
      ]);

      const out = await service.getDailySyndromeCounts(
        {
          startDate: '2026-01-01',
          endDate: '2026-01-02',
          onlyAboveThreshold: true,
          syndromeIds: [1, 2],
        } as any,
        5,
      );

      expect(out.labels).toEqual(['2026-01-01', '2026-01-02']);
      expect(out.series).toHaveLength(1);
      expect(out.series[0].syndromeId).toBe(1);
      expect(out.series[0].values[0]).toBe(4);
      expect(out.totalsBySyndrome[0].total).toBe(4);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('onlyAboveThreshold false não exige is_above_threshold no SQL', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getDailySyndromeCounts(
        {
          startDate: '2026-01-01',
          endDate: '2026-01-01',
          onlyAboveThreshold: false,
        } as any,
        1,
      );

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('getReportLatestScores', () => {
    it('lança NotFound quando report não existe', async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(service.getReportLatestScores(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('permite participante dono do report', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 1,
        participation: { context_id: 10, user_id: 42 },
      });
      prisma.report_syndrome_score.findMany.mockResolvedValue([]);

      const rows = await service.getReportLatestScores(1, 42);

      expect(rows).toEqual([]);
      expect(prisma.report_syndrome_score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { report_id: 1, is_latest: true },
        }),
      );
    });

    it('permite admin', async () => {
      authz.isAdmin.mockResolvedValue(true);
      prisma.report.findUnique.mockResolvedValue({
        id: 1,
        participation: { context_id: 10, user_id: 99 },
      });
      prisma.report_syndrome_score.findMany.mockResolvedValue([
        {
          id: 1,
          report_id: 1,
          syndrome_id: 2,
          score: 0.1,
          threshold_score_snapshot: 0.2,
          is_above_threshold: false,
          processing_status: 'skipped',
          processing_error: null,
          processed_at: new Date(),
          syndrome: { code: 'x', name: 'X' },
        },
      ]);

      const rows = await service.getReportLatestScores(1, 1);

      expect(rows).toHaveLength(1);
      expect(rows[0].syndromeCode).toBe('x');
    });

    it('permite gestor do contexto', async () => {
      authz.getManagedContextIds.mockResolvedValue([10]);
      prisma.report.findUnique.mockResolvedValue({
        id: 1,
        participation: { context_id: 10, user_id: 99 },
      });
      prisma.report_syndrome_score.findMany.mockResolvedValue([]);

      await expect(service.getReportLatestScores(1, 5)).resolves.toEqual([]);
    });

    it('lança Forbidden quando não há permissão', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 1,
        participation: { context_id: 10, user_id: 99 },
      });

      await expect(service.getReportLatestScores(1, 5)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('listSymptoms', () => {
    it('delega ao modelo symptom', async () => {
      const rows = await service.listSymptoms();
      expect(rows).toEqual([{ id: 1, code: 'fever', name: 'Febre' }]);
      expect(prisma.symptom.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('triggerClassification', () => {
    it('dispara classifyReport sem bloquear', async () => {
      const spy = jest
        .spyOn(service, 'classifyReport')
        .mockResolvedValue(undefined);

      service.triggerClassification(123);

      await new Promise((r) => setImmediate(r));

      expect(spy).toHaveBeenCalledWith(123);
      spy.mockRestore();
    });
  });

  describe('reprocessReports', () => {
    it('não-admin recebe Forbidden', async () => {
      authz.isAdmin.mockResolvedValue(false);

      await expect(
        service.reprocessReports({ limit: 1 } as any, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('admin sem reports retorna contagens zeradas', async () => {
      authz.isAdmin.mockResolvedValue(true);
      prisma.report.findMany.mockResolvedValue([]);

      const out = await service.reprocessReports(
        { limit: 50, contextId: 3 } as any,
        1,
      );

      expect(out.requestedCount).toBe(0);
      expect(out.processedCount).toBe(0);
      expect(prisma.report.findMany).toHaveBeenCalled();
    });

    it('admin monta where com formVersionId, cursor e só endDate', async () => {
      authz.isAdmin.mockResolvedValue(true);
      prisma.report.findMany.mockResolvedValue([]);

      await service.reprocessReports(
        {
          formVersionId: 9,
          cursor: 50,
          endDate: '2026-06-01',
          limit: 10,
        } as any,
        1,
      );

      const where = prisma.report.findMany.mock.calls[0][0].where;
      expect(where.report_type).toBe(report_type_enum.NEGATIVE);
      expect(where.form_version_id).toBe(9);
      expect(where.id).toEqual({ gt: 50 });
      expect(where.created_at.lte).toBeInstanceOf(Date);
    });

    it('admin reprocess: report_type NEGATIVE quando env exige NEGATIVE', async () => {
      configGet.mockImplementation((key: string) =>
        key === 'SYNDROMIC_CLASSIFICATION_REPORT_TYPE' ? 'NEGATIVE' : undefined,
      );
      authz.isAdmin.mockResolvedValue(true);
      prisma.report.findMany.mockResolvedValue([]);

      await service.reprocessReports({ limit: 5 } as any, 1);

      const where = prisma.report.findMany.mock.calls[0][0].where;
      expect(where.report_type).toBe(report_type_enum.NEGATIVE);
    });

    it('admin combina reportIds com cursor no filtro de id', async () => {
      authz.isAdmin.mockResolvedValue(true);
      prisma.report.findMany.mockResolvedValue([{ id: 200 }]);
      prisma.report_syndrome_score.findFirst.mockResolvedValue({
        processing_status: 'skipped',
      });

      await service.reprocessReports(
        {
          reportIds: [1, 2, 3],
          cursor: 10,
          limit: 5,
        } as any,
        1,
      );

      const where = prisma.report.findMany.mock.calls[0][0].where;
      expect(where.id).toEqual({ in: [1, 2, 3], gt: 10 });
    });
  });

  describe('CRUD de sintomas, síndromes, pesos, configs e mapeamentos', () => {
    it('createSymptom persiste e audita', async () => {
      prisma.symptom.create.mockResolvedValue({
        id: 10,
        code: 'tos',
        name: 'Tosse',
      });

      const created = await service.createSymptom(
        { code: ' tos ', name: ' Tosse ', description: 'd' } as any,
        3,
      );

      expect(created.id).toBe(10);
      expect(prisma.symptom.create).toHaveBeenCalledWith({
        data: { code: 'tos', name: 'Tosse', description: 'd' },
      });
      expect(auditRecord).toHaveBeenCalled();
    });

    it('updateSymptom e removeSymptom', async () => {
      prisma.symptom.findUnique
        .mockResolvedValueOnce({ id: 1, code: 'a', name: 'A' })
        .mockResolvedValueOnce({ id: 1, code: 'a', name: 'A' });
      prisma.symptom.update.mockResolvedValue({ id: 1, code: 'b', name: 'B' });

      const updated = await service.updateSymptom(
        1,
        { code: 'b', name: 'B' } as any,
        1,
      );
      expect(updated.code).toBe('b');

      prisma.symptom.findUnique.mockResolvedValueOnce({ id: 1, code: 'b', name: 'B' });
      await service.removeSymptom(1, 1);
      expect(prisma.symptom.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: { active: false } }),
      );
    });

    it('updateSymptom lança NotFound quando não existe', async () => {
      prisma.symptom.findUnique.mockResolvedValue(null);
      await expect(
        service.updateSymptom(99, { name: 'x' } as any, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('listSyndromes e createSyndrome', async () => {
      prisma.syndrome.findMany.mockResolvedValue([{ id: 2 }]);
      expect(await service.listSyndromes()).toEqual([{ id: 2 }]);

      prisma.syndrome.create.mockResolvedValue({
        id: 3,
        code: 'd',
        name: 'D',
      });
      const created = await service.createSyndrome(
        { code: 'd', name: 'D', thresholdScore: 0.25 } as any,
        1,
      );
      expect(created.id).toBe(3);
    });

    it('updateSyndrome e removeSyndrome', async () => {
      prisma.syndrome.findUnique.mockResolvedValue({
        id: 1,
        code: 'c',
        name: 'C',
        threshold_score: 0.1,
      });
      prisma.syndrome.update.mockResolvedValue({ id: 1, threshold_score: 0.2 });
      await service.updateSyndrome(1, { thresholdScore: 0.2 } as any, 1);

      prisma.syndrome.findUnique.mockResolvedValueOnce({
        id: 1,
        code: 'c',
        name: 'C',
      });
      await service.removeSyndrome(1, 1);
      expect(prisma.syndrome.update).toHaveBeenCalled();
    });

    it('listWeights, createWeight, updateWeight e removeWeight', async () => {
      prisma.syndrome_symptom_weight.findMany.mockResolvedValueOnce([
        { id: 1, syndrome_id: 1, symptom_id: 2 },
      ]);
      expect((await service.listWeights()).length).toBe(1);

      prisma.syndrome_symptom_weight.create.mockResolvedValue({
        id: 5,
        syndrome_id: 1,
        symptom_id: 2,
        weight: 0.5,
      });
      await service.createWeight(
        { syndromeId: 1, symptomId: 2, weight: 0.5 } as any,
        1,
      );

      prisma.syndrome_symptom_weight.findUnique.mockResolvedValue({
        id: 5,
        syndrome_id: 1,
        symptom_id: 2,
      });
      prisma.syndrome_symptom_weight.update.mockResolvedValue({
        id: 5,
        weight: 0.6,
      });
      await service.updateWeight(5, { weight: 0.6 } as any, 1);

      prisma.syndrome_symptom_weight.findUnique.mockResolvedValueOnce({
        id: 5,
        syndrome_id: 1,
        symptom_id: 2,
      });
      await service.removeWeight(5, 1);
    });

    it('getWeightMatrix agrega listas', async () => {
      prisma.syndrome.findMany.mockResolvedValueOnce([
        { id: 1, code: 's', name: 'S', threshold_score: 0.3 },
      ]);
      prisma.symptom.findMany.mockResolvedValueOnce([
        { id: 2, code: 'm', name: 'M' },
      ]);
      prisma.syndrome_symptom_weight.findMany.mockResolvedValueOnce([
        {
          id: 9,
          syndrome_id: 1,
          symptom_id: 2,
          weight: 0.4,
          updated_at: new Date(),
        },
      ]);

      const matrix = await service.getWeightMatrix();
      expect(matrix.syndromes[0].threshold_score).toBe(0.3);
      expect(matrix.cells[0].weight).toBe(0.4);
      expect(matrix.generatedAt).toBeInstanceOf(Date);
    });

    it('upsertWeightMatrix rejeita duplicidade de par síndrome/sintoma', async () => {
      await expect(
        service.upsertWeightMatrix(
          {
            cells: [
              { syndromeId: 1, symptomId: 2, weight: 0.1 },
              { syndromeId: 1, symptomId: 2, weight: 0.2 },
            ],
          } as any,
          1,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('upsertWeightMatrix executa transação', async () => {
      const out = await service.upsertWeightMatrix(
        {
          cells: [{ syndromeId: 1, symptomId: 2, weight: 0.33, active: true }],
        } as any,
        1,
      );
      expect(out.updatedCount).toBe(1);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('createFormConfig exige symptomsFieldName ou symptomsFieldId', async () => {
      await expect(
        service.createFormConfig({ formId: 1 } as any, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('listFormConfigs, createFormConfig, updateFormConfig e removeFormConfig', async () => {
      prisma.syndrome_form_config.findMany.mockResolvedValue([{ id: 1 }]);
      expect(await service.listFormConfigs()).toEqual([{ id: 1 }]);

      prisma.syndrome_form_config.create.mockResolvedValue({ id: 11, form_id: 5 });
      const c = await service.createFormConfig(
        { formId: 5, symptomsFieldName: 'sintomas' } as any,
        1,
      );
      expect(c.id).toBe(11);

      prisma.syndrome_form_config.findUnique.mockResolvedValue({
        id: 11,
        symptoms_field_name: 'sintomas',
        symptoms_field_id: null,
      });
      prisma.syndrome_form_config.update.mockResolvedValue({ id: 11, active: false });
      await service.updateFormConfig(11, { active: false } as any, 1);

      prisma.syndrome_form_config.findUnique.mockResolvedValueOnce({
        id: 11,
        symptoms_field_name: 'sintomas',
        symptoms_field_id: null,
      });
      await service.removeFormConfig(11, 1);
    });

    it('listFormSymptomMappings e CRUD de mapeamento', async () => {
      prisma.form_symptom_mapping.findMany.mockResolvedValue([{ id: 1 }]);
      expect(await service.listFormSymptomMappings()).toEqual([{ id: 1 }]);

      prisma.form_symptom_mapping.create.mockResolvedValue({ id: 20 });
      await service.createFormSymptomMapping(
        {
          syndromeFormConfigId: 1,
          formOptionValue: 'v',
          symptomId: 2,
        } as any,
        1,
      );

      prisma.form_symptom_mapping.findUnique.mockResolvedValue({
        id: 20,
        syndrome_form_config_id: 1,
      });
      prisma.form_symptom_mapping.update.mockResolvedValue({ id: 20 });
      await service.updateFormSymptomMapping(20, { formOptionLabel: 'L' } as any, 1);

      prisma.form_symptom_mapping.findUnique.mockResolvedValueOnce({
        id: 20,
        syndrome_form_config_id: 1,
      });
      await service.removeFormSymptomMapping(20, 1);
    });
  });
});
