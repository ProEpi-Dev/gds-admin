import { Test, TestingModule } from '@nestjs/testing';
import { ReportIntegrationsService } from './report-integrations.service';
import { EphemClient } from './ephem.client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { IntegrationEventQueryDto } from './dto/integration-event-query.dto';
import { UpsertIntegrationConfigDto } from './dto/upsert-integration-config.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('ReportIntegrationsService', () => {
  let service: ReportIntegrationsService;
  let prisma: any;
  let ephemClient: any;
  let authz: { isAdmin: jest.Mock; getManagedContextIds: jest.Mock };
  let auditLog: { record: jest.Mock };

  beforeEach(async () => {
    authz = {
      isAdmin: jest.fn().mockResolvedValue(false),
      getManagedContextIds: jest.fn().mockResolvedValue([]),
    };
    prisma = {
      participation: {
        findFirst: jest.fn(),
      },
      location: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      report: {
        findUnique: jest.fn(),
      },
      report_integration_event: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      report_integration_message: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
      },
      integration_config: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    // Service usa getters que acessam (this.prisma as any).xxx
    // O mock já tem essas propriedades definidas acima.

    ephemClient = {
      createEvent: jest.fn(),
      getMessages: jest.fn(),
      sendMessage: jest.fn(),
      listSignals: jest.fn(),
    };

    auditLog = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportIntegrationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EphemClient, useValue: ephemClient },
        { provide: AuthzService, useValue: authz },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<ReportIntegrationsService>(
      ReportIntegrationsService,
    );
  });

  describe('isEligibleForIntegration', () => {
    it('deve retornar false para report inexistente', async () => {
      prisma.report.findUnique.mockResolvedValue(null);
      expect(await service.isEligibleForIntegration(999)).toBe(false);
    });

    it('deve retornar false para report NEGATIVE', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 1,
        report_type: 'NEGATIVE',
        form_version: { form: { type: 'signal' } },
        participation: {
          context: {
            context_module: [{ module_code: 'community_signal' }],
          },
        },
      });
      expect(await service.isEligibleForIntegration(1)).toBe(false);
    });

    it('deve retornar false quando type não é signal', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 1,
        report_type: 'POSITIVE',
        form_version: { form: { type: 'quiz' } },
        participation: {
          context: {
            context_module: [{ module_code: 'community_signal' }],
          },
        },
      });
      expect(await service.isEligibleForIntegration(1)).toBe(false);
    });

    it('deve retornar false quando contexto não tem community_signal', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 1,
        report_type: 'POSITIVE',
        form_version: { form: { type: 'signal' } },
        participation: {
          context: {
            context_module: [{ module_code: 'self_health' }],
          },
        },
      });
      expect(await service.isEligibleForIntegration(1)).toBe(false);
    });

    it('deve retornar true quando todas condições são atendidas', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 1,
        report_type: 'POSITIVE',
        form_version: { form: { type: 'signal' } },
        participation: {
          context: {
            context_module: [{ module_code: 'community_signal' }],
          },
        },
      });
      expect(await service.isEligibleForIntegration(1)).toBe(true);
    });
  });

  describe('retryIntegration', () => {
    it('deve lançar NotFoundException se evento não existe', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue(null);
      await expect(service.retryIntegration(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException se status é "sent"', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        status: 'sent',
        report_id: 10,
      });
      await expect(service.retryIntegration(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException se status é "processing"', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        status: 'processing',
        report_id: 10,
      });
      await expect(service.retryIntegration(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('permite retry quando status é "pending"', async () => {
      const dispatchSpy = jest
        .spyOn(service, 'dispatchIntegrationEvent')
        .mockResolvedValue(undefined);

      prisma.report_integration_event.findUnique
        .mockResolvedValueOnce({
          id: 2,
          status: 'pending',
          report_id: 50,
        })
        .mockResolvedValueOnce({
          id: 2,
          report_id: 50,
          external_event_id: null,
          status: 'pending',
          environment: 'production',
          attempt_count: 0,
          last_attempt_at: null,
          last_error: null,
          created_at: new Date(),
          updated_at: new Date(),
          messages: [],
        });

      prisma.report_integration_event.update.mockResolvedValue({});

      const res = await service.retryIntegration(2);

      expect(dispatchSpy).toHaveBeenCalledWith(50);
      expect(res.reportId).toBe(50);
      dispatchSpy.mockRestore();
    });

    it('deve lançar NotFound se o evento deixar de existir após o reenvio', async () => {
      jest.spyOn(service, 'dispatchIntegrationEvent').mockResolvedValue(undefined);

      prisma.report_integration_event.findUnique
        .mockResolvedValueOnce({
          id: 3,
          status: 'failed',
          report_id: 60,
        })
        .mockResolvedValueOnce(null);

      prisma.report_integration_event.update.mockResolvedValue({});

      await expect(service.retryIntegration(3)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve reenviar e retornar evento atualizado após dispatch', async () => {
      const dispatchSpy = jest
        .spyOn(service, 'dispatchIntegrationEvent')
        .mockResolvedValue(undefined);

      prisma.report_integration_event.findUnique
        .mockResolvedValueOnce({
          id: 20,
          status: 'failed',
          report_id: 77,
        })
        .mockResolvedValueOnce({
          id: 20,
          report_id: 77,
          external_event_id: 'ext-77',
          status: 'sent',
          environment: 'production',
          attempt_count: 1,
          last_attempt_at: new Date(),
          last_error: null,
          created_at: new Date(),
          updated_at: new Date(),
          messages: [],
        });

      prisma.report_integration_event.update.mockResolvedValue({});

      const result = await service.retryIntegration(20);

      expect(dispatchSpy).toHaveBeenCalledWith(77);
      expect(result.reportId).toBe(77);
      expect(result.status).toBe('sent');
      dispatchSpy.mockRestore();
    });
  });

  describe('findEventByReportId', () => {
    it('deve retornar null se não existir', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue(null);
      expect(await service.findEventByReportId(999, 1)).toBeNull();
    });

    it('deve lançar Forbidden quando o utilizador não pode aceder ao report', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        report_id: 10,
        external_event_id: null,
        status: 'pending',
        environment: 'production',
        attempt_count: 0,
        last_attempt_at: null,
        last_error: null,
        request_payload: {},
        response_payload: {},
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
        report: {
          participation: {
            context_id: 1,
            user_id: 42,
            integration_training_mode: false,
          },
        },
      });
      await expect(service.findEventByReportId(10, 99)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Forbidden quando participation vem ausente no report', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        report_id: 10,
        external_event_id: null,
        status: 'pending',
        environment: 'production',
        attempt_count: 0,
        last_attempt_at: null,
        last_error: null,
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
        report: { participation: null },
      });
      await expect(service.findEventByReportId(10, 42)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('permite o próprio participante aceder ao evento', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        report_id: 10,
        external_event_id: null,
        status: 'sent',
        environment: 'production',
        attempt_count: 0,
        last_attempt_at: null,
        last_error: null,
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
        report: {
          participation: {
            context_id: 1,
            user_id: 42,
            integration_training_mode: false,
          },
        },
      });
      const result = await service.findEventByReportId(10, 42);
      expect(result).toBeTruthy();
      expect(result!.reportId).toBe(10);
      expect(ephemClient.listSignals).not.toHaveBeenCalled();
    });

    it('permite gestor do contexto aceder via getManagedContextIds', async () => {
      authz.getManagedContextIds.mockResolvedValueOnce([7]);
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        report_id: 10,
        external_event_id: null,
        status: 'pending',
        environment: 'production',
        attempt_count: 0,
        last_attempt_at: null,
        last_error: null,
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
        report: {
          participation: {
            context_id: 7,
            user_id: 99,
            integration_training_mode: false,
          },
        },
      });
      const result = await service.findEventByReportId(10, 1);
      expect(result).toBeTruthy();
    });

    it('permite admin global aceder a report de outro utilizador', async () => {
      authz.isAdmin.mockResolvedValueOnce(true);
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        report_id: 10,
        external_event_id: null,
        status: 'pending',
        environment: 'production',
        attempt_count: 0,
        last_attempt_at: null,
        last_error: null,
        request_payload: {},
        response_payload: {},
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
        report: {
          participation: {
            context_id: 1,
            user_id: 42,
            integration_training_mode: false,
          },
        },
      });
      const result = await service.findEventByReportId(10, 99);
      expect(result).toBeTruthy();
      expect(result!.reportId).toBe(10);
    });

    it('deve retornar DTO mapeado', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        report_id: 10,
        external_event_id: '107',
        status: 'sent',
        environment: 'production',
        attempt_count: 1,
        last_attempt_at: new Date(),
        last_error: null,
        request_payload: {},
        response_payload: {},
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
        report: {
          participation: {
            context_id: 1,
            user_id: 42,
            integration_training_mode: false,
          },
        },
      });
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 1,
        base_url_production: 'https://ephem.test',
        base_url_homologation: null,
        auth_config: { token: 't' },
        timeout_ms: 30000,
      });
      ephemClient.listSignals.mockResolvedValue([
        {
          eventId: 107,
          dados: { signal_stage_state_id: [2, 'Em análise'] },
        },
      ]);

      const result = await service.findEventByReportId(10, 42);
      expect(result).toBeTruthy();
      expect(result!.reportId).toBe(10);
      expect(result!.externalEventId).toBe('107');
      expect(result!.status).toBe('sent');
      expect(result!.externalSignalStageId).toBe(2);
      expect(result!.externalSignalStageLabel).toBe('Em análise');
    });

    it('deve retornar estágio nulo quando listSignals falha', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        report_id: 10,
        external_event_id: '107',
        status: 'sent',
        environment: 'production',
        attempt_count: 0,
        last_attempt_at: null,
        last_error: null,
        request_payload: {},
        response_payload: {},
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
        report: {
          participation: {
            context_id: 1,
            user_id: 42,
            integration_training_mode: false,
          },
        },
      });
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 1,
        base_url_production: 'https://ephem.test',
        base_url_homologation: null,
        auth_config: { token: 't' },
        timeout_ms: 30000,
      });
      ephemClient.listSignals.mockRejectedValue(new Error('network'));

      const result = await service.findEventByReportId(10, 42);
      expect(result!.externalSignalStageId).toBeNull();
      expect(result!.externalSignalStageLabel).toBeNull();
    });
  });

  describe('getConfigByContext', () => {
    it('deve retornar null se nenhuma config ativa', async () => {
      prisma.integration_config.findFirst.mockResolvedValue(null);
      expect(await service.getConfigByContext(1)).toBeNull();
    });

    it('deve retornar DTO com authConfig mascarado', async () => {
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 1,
        version: 2,
        is_active: true,
        base_url_production: 'https://prod.api',
        base_url_homologation: 'https://homolog.api',
        auth_config: { type: 'static_token', token: 'secret-value' },
        payload_mapping: { field1: 'Label1' },
        timeout_ms: 30000,
        max_retries: 3,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.getConfigByContext(1);
      expect(result).toBeTruthy();
      expect(result!.authConfig).toEqual({
        type: 'static_token',
        hasToken: true,
      });
      expect(result!.version).toBe(2);
    });

    it('authConfig null quando integração não define auth_config', async () => {
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 2,
        context_id: 1,
        version: 1,
        is_active: true,
        base_url_production: 'https://p',
        base_url_homologation: null,
        auth_config: null,
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.getConfigByContext(1);
      expect(result).toBeTruthy();
      expect(result!.authConfig).toBeNull();
    });
  });

  describe('dispatchIntegrationEvent', () => {
    it('deve achatar campo location e mapear IDs para nomes', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 99,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 99,
          form_response: {
            localizacao: {
              evento_pais_ocorrencia: 3,
              evento_estado_ocorrencia: 4,
              evento_municipio_ocorrencia: 5,
            },
            evento_afetados: ['Adultos', 'Adolescentes'],
          },
          participation: {
            context_id: 2,
            integration_training_mode: false,
            user: {
              id: 10,
              email: 'lider@test.com',
              name: 'Lider',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: {
            form: { type: 'signal' },
            definition: {
              fields: [
                {
                  name: 'localizacao',
                  label: 'Localização Administrativa',
                  type: 'location',
                  locationConfig: {
                    countryKey: 'evento_pais_ocorrencia',
                    stateDistrictKey: 'evento_estado_ocorrencia',
                    cityCouncilKey: 'evento_municipio_ocorrencia',
                  },
                },
                {
                  name: 'evento_afetados',
                  label: 'Afetados',
                  type: 'multiselect',
                },
              ],
            },
          },
        });

      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 2,
        is_active: true,
        base_url_production: 'https://prod.api',
        base_url_homologation: 'https://homolog.api',
        auth_config: { token: 'tok' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });

      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 1,
        attempt_count: 0,
      });
      prisma.location.findMany.mockResolvedValue([
        { id: 3, name: 'Cabo Verde' },
        { id: 4, name: 'Santiago' },
        { id: 5, name: 'Praia' },
      ]);
      ephemClient.createEvent.mockResolvedValue({ id: 'ext-99' });

      await service.dispatchIntegrationEvent(99);

      expect(ephemClient.createEvent).toHaveBeenCalled();
      const payload = ephemClient.createEvent.mock.calls[0][1];
      expect(payload.data.localizacao).toBeUndefined();
      expect(payload.data.evento_pais_ocorrencia).toBe('Cabo Verde');
      expect(payload.data.evento_estado_ocorrencia).toBe('Santiago');
      expect(payload.data.evento_municipio_ocorrencia).toBe('Praia');
      expect(payload.data.evento_afetados).toBe('Adultos, Adolescentes');
      expect(payload.aditionalData['País']).toBe('Cabo Verde');
      expect(payload.aditionalData['Estado/Distrito']).toBe('Santiago');
      expect(payload.aditionalData['Cidade/Concelho']).toBe('Praia');
      expect(payload.aditionalData.Afetados).toBe('Adultos, Adolescentes');
    });

    it('deve usar nomes do form_response sem consultar location', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 100,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 100,
          form_response: {
            localizacao: {
              evento_pais_ocorrencia: 3,
              evento_pais_ocorrencia_nome: 'Cabo Verde',
              evento_estado_ocorrencia: 4,
              evento_estado_ocorrencia_nome: 'Santiago',
              evento_municipio_ocorrencia: 5,
              evento_municipio_ocorrencia_nome: 'Praia',
            },
          },
          participation: {
            context_id: 2,
            integration_training_mode: false,
            user: {
              id: 10,
              email: 'lider@test.com',
              name: 'Lider',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: {
            form: { type: 'signal' },
            definition: {
              fields: [
                {
                  name: 'localizacao',
                  label: 'Localização Administrativa',
                  type: 'location',
                  locationConfig: {
                    countryKey: 'evento_pais_ocorrencia',
                    countryNameKey: 'evento_pais_ocorrencia_nome',
                    stateDistrictKey: 'evento_estado_ocorrencia',
                    stateDistrictNameKey: 'evento_estado_ocorrencia_nome',
                    cityCouncilKey: 'evento_municipio_ocorrencia',
                    cityCouncilNameKey: 'evento_municipio_ocorrencia_nome',
                  },
                },
              ],
            },
          },
        });

      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 2,
        is_active: true,
        base_url_production: 'https://prod.api',
        base_url_homologation: 'https://homolog.api',
        auth_config: { token: 'tok' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });

      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 2,
        attempt_count: 0,
      });
      ephemClient.createEvent.mockResolvedValue({ id: 'ext-100' });

      await service.dispatchIntegrationEvent(100);

      expect(prisma.location.findMany).not.toHaveBeenCalled();
      const payload = ephemClient.createEvent.mock.calls[0][1];
      expect(payload.data.evento_pais_ocorrencia_nome).toBe('Cabo Verde');
      expect(payload.data.evento_estado_ocorrencia_nome).toBe('Santiago');
      expect(payload.data.evento_municipio_ocorrencia_nome).toBe('Praia');
      expect(payload.data.evento_pais_ocorrencia).toBeUndefined();
      expect(payload.data.evento_estado_ocorrencia).toBeUndefined();
      expect(payload.data.evento_municipio_ocorrencia).toBeUndefined();
      expect(payload.aditionalData['País']).toBe('Cabo Verde');
      expect(payload.aditionalData['Estado/Distrito']).toBe('Santiago');
      expect(payload.aditionalData['Cidade/Concelho']).toBe('Praia');
    });

    it('deve usar chaves de nome em data quando id e nome estão separados (*_id / sem sufixo)', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 103,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 103,
          form_response: {
            loc: {
              evento_pais_ocorrencia_id: 3,
              evento_pais_ocorrencia: 'Cabo Verde',
              evento_estado_ocorrencia_id: 4,
              evento_estado_ocorrencia: 'Santiago',
              evento_municipio_ocorrencia_id: 5,
              evento_municipio_ocorrencia: 'Praia',
            },
          },
          participation: {
            context_id: 2,
            integration_training_mode: false,
            user: {
              id: 10,
              email: 'u@test.com',
              name: 'U',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: {
            form: { type: 'signal' },
            definition: {
              fields: [
                {
                  name: 'loc',
                  label: 'Localização',
                  type: 'location',
                  locationConfig: {
                    countryKey: 'evento_pais_ocorrencia_id',
                    countryNameKey: 'evento_pais_ocorrencia',
                    stateDistrictKey: 'evento_estado_ocorrencia_id',
                    stateDistrictNameKey: 'evento_estado_ocorrencia',
                    cityCouncilKey: 'evento_municipio_ocorrencia_id',
                    cityCouncilNameKey: 'evento_municipio_ocorrencia',
                  },
                },
              ],
            },
          },
        });

      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 2,
        is_active: true,
        base_url_production: 'https://prod.api',
        base_url_homologation: null,
        auth_config: { token: 'tok' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });
      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 5,
        attempt_count: 0,
      });
      ephemClient.createEvent.mockResolvedValue({ id: 'ext-103' });

      await service.dispatchIntegrationEvent(103);

      expect(prisma.location.findMany).not.toHaveBeenCalled();
      const payload = ephemClient.createEvent.mock.calls[0][1];
      expect(payload.data.evento_pais_ocorrencia).toBe('Cabo Verde');
      expect(payload.data.evento_estado_ocorrencia).toBe('Santiago');
      expect(payload.data.evento_municipio_ocorrencia).toBe('Praia');
      expect(payload.data.evento_pais_ocorrencia_id).toBeUndefined();
      expect(payload.data.evento_estado_ocorrencia_id).toBeUndefined();
      expect(payload.data.evento_municipio_ocorrencia_id).toBeUndefined();
    });

    it('deve enviar campos date como dd-MM-yyyy para o integrador', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 102,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 102,
          form_response: { evento_data_ocorrencia: '2026-04-05' },
          participation: {
            context_id: 2,
            integration_training_mode: false,
            user: {
              id: 10,
              email: 'u@test.com',
              name: 'U',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: {
            form: { type: 'signal' },
            definition: {
              fields: [
                {
                  name: 'evento_data_ocorrencia',
                  label: 'Quando ocorreu?',
                  type: 'date',
                },
              ],
            },
          },
        });

      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 2,
        is_active: true,
        base_url_production: 'https://prod.api',
        base_url_homologation: null,
        auth_config: { token: 'tok' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });
      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 4,
        attempt_count: 0,
      });
      ephemClient.createEvent.mockResolvedValue({ id: 'ext-102' });

      await service.dispatchIntegrationEvent(102);

      const payload = ephemClient.createEvent.mock.calls[0][1];
      expect(payload.data.evento_data_ocorrencia).toBe('05-04-2026');
      expect(payload.aditionalData['Quando ocorreu?']).toBe('05-04-2026');
    });

    it('deve enviar mapPoint como string lat/lng para o integrador', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 104,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 104,
          form_response: {
            ponto_mapa: { latitude: -23.55052, longitude: -46.633308 },
          },
          participation: {
            context_id: 2,
            integration_training_mode: false,
            user: {
              id: 10,
              email: 'u@test.com',
              name: 'U',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: {
            form: { type: 'signal' },
            definition: {
              fields: [
                {
                  name: 'ponto_mapa',
                  label: 'Localização no mapa (opcional)',
                  type: 'mapPoint',
                },
              ],
            },
          },
        });

      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 2,
        is_active: true,
        base_url_production: 'https://prod.api',
        base_url_homologation: null,
        auth_config: { token: 'tok' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });
      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 6,
        attempt_count: 0,
      });
      ephemClient.createEvent.mockResolvedValue({ id: 'ext-104' });

      await service.dispatchIntegrationEvent(104);

      const payload = ephemClient.createEvent.mock.calls[0][1];
      expect(payload.data.ponto_mapa).toBe('-23.550520, -46.633308');
      expect(typeof payload.data.ponto_mapa).toBe('string');
      expect(payload.aditionalData['Localização no mapa (opcional)']).toBe(
        '-23.550520, -46.633308',
      );
    });

    it('deve corrigir label mojibake UTF-8 em aditionalData', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 101,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 101,
          form_response: { campo_x: 'ok' },
          participation: {
            context_id: 2,
            integration_training_mode: false,
            user: {
              id: 10,
              email: 'u@test.com',
              name: 'U',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: {
            form: { type: 'signal' },
            definition: {
              fields: [
                {
                  name: 'campo_x',
                  label: 'Quem sÃ£o os afetados?',
                  type: 'text',
                },
              ],
            },
          },
        });

      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 2,
        is_active: true,
        base_url_production: 'https://prod.api',
        base_url_homologation: null,
        auth_config: { token: 'tok' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });
      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 3,
        attempt_count: 0,
      });
      ephemClient.createEvent.mockResolvedValue({ id: 'ext-101' });

      await service.dispatchIntegrationEvent(101);

      const payload = ephemClient.createEvent.mock.calls[0][1];
      expect(payload.aditionalData['Quem são os afetados?']).toBe('ok');
    });

    it('retorna cedo quando o report não é elegível', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 1,
        report_type: 'NEGATIVE',
        form_version: { form: { type: 'signal' } },
        participation: {
          context: {
            context_module: [{ module_code: 'community_signal' }],
          },
        },
      });
      await service.dispatchIntegrationEvent(1);
      expect(prisma.integration_config.findFirst).not.toHaveBeenCalled();
      expect(ephemClient.createEvent).not.toHaveBeenCalled();
    });

    it('retorna cedo quando o report deixa de existir após verificação de elegibilidade', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 88,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce(null);

      await service.dispatchIntegrationEvent(88);

      expect(prisma.integration_config.findFirst).not.toHaveBeenCalled();
      expect(prisma.report_integration_event.upsert).not.toHaveBeenCalled();
      expect(ephemClient.createEvent).not.toHaveBeenCalled();
    });

    it('atualiza evento para sent quando Ephem devolve sucesso', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 300,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 300,
          form_response: { a: 'b' },
          participation: {
            context_id: 2,
            integration_training_mode: false,
            user: {
              id: 1,
              email: 'x@y.z',
              name: 'X',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: {
            form: { type: 'signal' },
            definition: { fields: [{ name: 'a', label: 'A', type: 'text' }] },
          },
        });
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 2,
        base_url_production: 'https://prod',
        base_url_homologation: null,
        auth_config: { token: 't' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });
      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 900,
        attempt_count: 0,
      });
      ephemClient.createEvent.mockResolvedValue({ id: 'ext-ok' });

      await service.dispatchIntegrationEvent(300);

      expect(prisma.report_integration_event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 900 },
          data: expect.objectContaining({
            status: 'sent',
            external_event_id: 'ext-ok',
          }),
        }),
      );
    });

    it('retorna cedo quando não há configuração ativa', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 2,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 2,
          form_response: {},
          participation: {
            context_id: 9,
            integration_training_mode: false,
            user: {
              id: 1,
              email: 'a@b.c',
              name: 'A',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: { form: { type: 'signal' }, definition: null },
        });
      prisma.integration_config.findFirst.mockResolvedValue(null);
      await service.dispatchIntegrationEvent(2);
      expect(ephemClient.createEvent).not.toHaveBeenCalled();
    });

    it('retorna cedo quando a URL do ambiente não está configurada', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 3,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 3,
          form_response: {},
          participation: {
            context_id: 9,
            integration_training_mode: false,
            user: {
              id: 1,
              email: 'a@b.c',
              name: 'A',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: { form: { type: 'signal' }, definition: null },
        });
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 9,
        base_url_production: null,
        base_url_homologation: null,
        auth_config: {},
        timeout_ms: 30000,
        max_retries: 3,
      });
      await service.dispatchIntegrationEvent(3);
      expect(ephemClient.createEvent).not.toHaveBeenCalled();
    });

    it('usa base de homologação em modo treinamento', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 4,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 4,
          form_response: { f: 'x' },
          participation: {
            context_id: 9,
            integration_training_mode: true,
            user: {
              id: 1,
              email: 'a@b.c',
              name: 'A',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: {
            form: { type: 'signal' },
            definition: { fields: [{ name: 'f', label: 'F', type: 'text' }] },
          },
        });
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 9,
        base_url_production: 'https://prod',
        base_url_homologation: 'https://homolog',
        auth_config: { token: 't' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });
      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 1,
        attempt_count: 0,
      });
      ephemClient.createEvent.mockResolvedValue({ id: 'h1' });
      await service.dispatchIntegrationEvent(4);
      expect(ephemClient.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ baseUrl: 'https://homolog' }),
        expect.anything(),
      );
    });

    it('marca evento como pending quando Ephem falha e ainda há retries', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 5,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 5,
          form_response: {},
          participation: {
            context_id: 9,
            integration_training_mode: false,
            user: {
              id: 1,
              email: 'a@b.c',
              name: 'A',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: { form: { type: 'signal' }, definition: null },
        });
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 9,
        base_url_production: 'https://prod',
        base_url_homologation: null,
        auth_config: { token: 't' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });
      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 10,
        attempt_count: 0,
      });
      ephemClient.createEvent.mockRejectedValue(new Error('timeout'));
      await service.dispatchIntegrationEvent(5);
      expect(prisma.report_integration_event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'pending' }),
        }),
      );
    });

    it('resolve país subindo hierarquia de location até org_level COUNTRY', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 201,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 201,
          form_response: { f: 'y' },
          participation: {
            context_id: 2,
            integration_training_mode: false,
            user: {
              id: 1,
              email: 'a@b.c',
              name: 'U',
              phone: null,
              location_id: 50,
              country_location_id: null,
            },
            context: {},
          },
          form_version: {
            form: { type: 'signal' },
            definition: {
              fields: [{ name: 'f', label: 'F', type: 'text' }],
            },
          },
        });
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 2,
        base_url_production: 'https://prod',
        base_url_homologation: null,
        auth_config: { token: 't' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });
      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 1,
        attempt_count: 0,
      });
      prisma.location.findUnique
        .mockResolvedValueOnce({
          id: 50,
          name: 'Cidade',
          parent_id: 60,
          org_level: 'CITY_COUNCIL',
        })
        .mockResolvedValueOnce({
          id: 60,
          name: 'Nação Teste',
          parent_id: null,
          org_level: 'COUNTRY',
        });
      ephemClient.createEvent.mockResolvedValue({ id: 'ok' });

      await service.dispatchIntegrationEvent(201);

      const payload = ephemClient.createEvent.mock.calls[0][1];
      expect(payload.userCountry).toBe('Nação Teste');
    });

    it('preenche país do usuário via country_location_id no payload', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 200,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 200,
          form_response: { titulo: 'x' },
          participation: {
            context_id: 2,
            integration_training_mode: false,
            user: {
              id: 1,
              email: 'a@b.c',
              name: 'Nome',
              phone: null,
              location_id: null,
              country_location_id: 900,
            },
            context: {},
          },
          form_version: {
            form: { type: 'signal' },
            definition: {
              fields: [{ name: 'titulo', label: 'Título', type: 'text' }],
            },
          },
        });
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 2,
        base_url_production: 'https://prod',
        base_url_homologation: null,
        auth_config: { token: 't' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });
      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 1,
        attempt_count: 0,
      });
      prisma.location.findUnique.mockResolvedValue({
        name: 'País X',
      });
      ephemClient.createEvent.mockResolvedValue({ id: 'ok' });

      await service.dispatchIntegrationEvent(200);

      const payload = ephemClient.createEvent.mock.calls[0][1];
      expect(payload.userCountry).toBe('País X');
      expect(prisma.location.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 900 } }),
      );
    });

    it('marca evento como failed quando Ephem falha sem retries restantes', async () => {
      prisma.report.findUnique
        .mockResolvedValueOnce({
          id: 6,
          report_type: 'POSITIVE',
          form_version: { form: { type: 'signal' } },
          participation: {
            context: {
              context_module: [{ module_code: 'community_signal' }],
            },
          },
        })
        .mockResolvedValueOnce({
          id: 6,
          form_response: {},
          participation: {
            context_id: 9,
            integration_training_mode: false,
            user: {
              id: 1,
              email: 'a@b.c',
              name: 'A',
              phone: null,
              location_id: null,
              country_location_id: null,
            },
            context: {},
          },
          form_version: { form: { type: 'signal' }, definition: null },
        });
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 1,
        context_id: 9,
        base_url_production: 'https://prod',
        base_url_homologation: null,
        auth_config: { token: 't' },
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
      });
      prisma.report_integration_event.upsert.mockResolvedValue({
        id: 11,
        attempt_count: 2,
      });
      ephemClient.createEvent.mockRejectedValue(new Error('fatal'));
      await service.dispatchIntegrationEvent(6);
      expect(prisma.report_integration_event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed' }),
        }),
      );
    });
  });

  describe('syncMessages', () => {
    it('lança NotFound quando o evento não existe', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue(null);
      await expect(service.syncMessages(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança Forbidden quando o utilizador não pode aceder ao evento', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        external_event_id: 'x',
        environment: 'production',
        report: {
          participation: { context_id: 1, user_id: 50 },
        },
      });
      await expect(service.syncMessages(1, 99)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('retorna lista vazia quando não há external_event_id', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        external_event_id: null,
        report: {
          participation: { context_id: 1, user_id: 1 },
        },
      });
      await expect(service.syncMessages(1, 1)).resolves.toEqual([]);
    });

    it('retorna lista vazia sem config ativa', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        external_event_id: '99',
        environment: 'production',
        report: {
          participation: { context_id: 1, user_id: 1 },
        },
      });
      prisma.integration_config.findFirst.mockResolvedValue(null);
      await expect(service.syncMessages(1, 1)).resolves.toEqual([]);
    });

    it('retorna lista vazia quando URL do ambiente não está definida', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        external_event_id: '99',
        environment: 'homologation',
        report: {
          participation: { context_id: 1, user_id: 1 },
        },
      });
      prisma.integration_config.findFirst.mockResolvedValue({
        base_url_production: 'https://p',
        base_url_homologation: null,
        auth_config: { token: 't' },
        timeout_ms: 5000,
      });
      await expect(service.syncMessages(1, 1)).resolves.toEqual([]);
    });

    it('persiste mensagens recebidas da Ephem', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 3,
        external_event_id: 'ext-1',
        environment: 'production',
        report: {
          participation: { context_id: 5, user_id: 88 },
        },
      });
      prisma.integration_config.findFirst.mockResolvedValue({
        base_url_production: 'https://api.test',
        base_url_homologation: null,
        auth_config: { token: 'tok' },
        timeout_ms: 8000,
      });
      ephemClient.getMessages.mockResolvedValue([
        {
          id: 'm-ext',
          message: 'ola',
          author: 'suporte',
          createdAt: '2024-06-01T12:00:00.000Z',
        },
      ]);
      prisma.report_integration_message.upsert.mockResolvedValue({});
      const createdAt = new Date('2024-06-01T12:00:00.000Z');
      prisma.report_integration_message.findMany.mockResolvedValue([
        {
          id: 100,
          external_message_id: 'm-ext',
          direction: 'inbound',
          body: 'ola',
          author: 'suporte',
          remote_created_at: createdAt,
          created_at: createdAt,
        },
      ]);

      const rows = await service.syncMessages(3, 88);
      expect(rows).toHaveLength(1);
      expect(rows[0].body).toBe('ola');
      expect(ephemClient.getMessages).toHaveBeenCalled();
    });

    it('usa campo body quando message não vem da Ephem', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 4,
        external_event_id: 'ext-2',
        environment: 'production',
        report: {
          participation: { context_id: 5, user_id: 1 },
        },
      });
      prisma.integration_config.findFirst.mockResolvedValue({
        base_url_production: 'https://api.test',
        base_url_homologation: null,
        auth_config: { token: 'tok' },
        timeout_ms: 8000,
      });
      ephemClient.getMessages.mockResolvedValue([
        {
          id: 'm2',
          body: 'só body',
          author: null,
          createdAt: null,
        },
      ]);
      prisma.report_integration_message.upsert.mockResolvedValue({});
      prisma.report_integration_message.findMany.mockResolvedValue([
        {
          id: 200,
          external_message_id: 'm2',
          direction: 'inbound',
          body: 'só body',
          author: null,
          remote_created_at: null,
          created_at: new Date(),
        },
      ]);

      const rows = await service.syncMessages(4, 1);
      expect(rows[0].body).toBe('só body');
      expect(prisma.report_integration_message.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ body: 'só body' }),
          update: expect.objectContaining({ body: 'só body' }),
        }),
      );
    });
  });

  describe('sendMessage', () => {
    it('lança NotFound quando o evento não existe', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue(null);
      await expect(service.sendMessage(1, 'oi', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança Forbidden quando o utilizador não pode aceder ao evento', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        external_event_id: 'e1',
        environment: 'production',
        report: { participation: { context_id: 1, user_id: 50 } },
      });
      await expect(service.sendMessage(1, 'oi', 99)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lança BadRequest quando o evento ainda não foi integrado', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        external_event_id: null,
        report: { participation: { context_id: 1, user_id: 1 } },
      });
      await expect(service.sendMessage(1, 'oi', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança BadRequest quando não há config', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        external_event_id: 'e1',
        environment: 'production',
        report: { participation: { context_id: 1, user_id: 1 } },
      });
      prisma.integration_config.findFirst.mockResolvedValue(null);
      await expect(service.sendMessage(1, 'oi', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança BadRequest quando falta URL do ambiente', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 1,
        external_event_id: 'e1',
        environment: 'production',
        report: { participation: { context_id: 1, user_id: 1 } },
      });
      prisma.integration_config.findFirst.mockResolvedValue({
        base_url_production: null,
        base_url_homologation: null,
        auth_config: {},
        timeout_ms: 3000,
      });
      await expect(service.sendMessage(1, 'oi', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('envia mensagem e persiste resposta', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue({
        id: 2,
        external_event_id: 'e9',
        environment: 'production',
        report: { participation: { context_id: 3, user_id: 3 } },
      });
      prisma.integration_config.findFirst.mockResolvedValue({
        base_url_production: 'https://api',
        base_url_homologation: null,
        auth_config: { token: 't' },
        timeout_ms: 3000,
      });
      ephemClient.sendMessage.mockResolvedValue({ id: 'out-1' });
      prisma.report_integration_message.create.mockResolvedValue({
        id: 50,
        external_message_id: 'out-1',
        direction: 'outbound',
        body: 'texto',
        author: null,
        remote_created_at: null,
        created_at: new Date(),
      });

      const dto = await service.sendMessage(2, 'texto', 3);
      expect(dto.body).toBe('texto');
      expect(ephemClient.sendMessage).toHaveBeenCalled();
    });
  });

  describe('findEvents', () => {
    it('retorna lista paginada e meta', async () => {
      prisma.report_integration_event.findMany.mockResolvedValue([
        {
          id: 1,
          report_id: 10,
          external_event_id: null,
          status: 'pending',
          environment: 'production',
          attempt_count: 0,
          last_attempt_at: null,
          last_error: null,
          created_at: new Date(),
          updated_at: new Date(),
          messages: [],
        },
      ]);
      prisma.report_integration_event.count.mockResolvedValue(1);

      const q = Object.assign(new IntegrationEventQueryDto(), {
        page: 1,
        pageSize: 20,
        status: 'pending',
        contextId: 7,
      });

      const res = await service.findEvents(q);
      expect(res.data).toHaveLength(1);
      expect(res.meta.page).toBe(1);
      expect(res.meta.totalItems).toBe(1);
      expect(res.links.first).toContain('/v1/report-integrations');
    });

    it('usa page=1 e pageSize=20 por defeito', async () => {
      prisma.report_integration_event.findMany.mockResolvedValue([]);
      prisma.report_integration_event.count.mockResolvedValue(0);

      const res = await service.findEvents(new IntegrationEventQueryDto());

      expect(res.meta.page).toBe(1);
      expect(res.meta.pageSize).toBe(20);
      expect(prisma.report_integration_event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe('findEventsByParticipationForUser', () => {
    it('lança Forbidden quando participação não pertence ao usuário', async () => {
      prisma.participation.findFirst.mockResolvedValue(null);
      await expect(service.findEventsByParticipationForUser(9, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lista eventos com estágio quando Ephem responde', async () => {
      prisma.participation.findFirst.mockResolvedValue({
        id: 3,
        context_id: 2,
        user_id: 8,
        integration_training_mode: false,
      });
      prisma.report_integration_event.findMany.mockResolvedValue([
        {
          id: 30,
          report_id: 100,
          external_event_id: '200',
          status: 'sent',
          environment: 'production',
          attempt_count: 0,
          last_attempt_at: null,
          last_error: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
      prisma.integration_config.findFirst.mockResolvedValue({
        base_url_production: 'https://ephem',
        base_url_homologation: null,
        auth_config: { token: 'x' },
        timeout_ms: 10000,
      });
      ephemClient.listSignals.mockResolvedValue([
        { eventId: 200, dados: { signal_stage_state_id: [4, 'Fechado'] } },
      ]);

      const list = await service.findEventsByParticipationForUser(3, 8);
      expect(list).toHaveLength(1);
      expect(list[0].externalSignalStageId).toBe(4);
      expect(list[0].externalSignalStageLabel).toBe('Fechado');
    });

    it('estágio externo fica nulo quando o evento não tem external_event_id', async () => {
      prisma.participation.findFirst.mockResolvedValue({
        id: 3,
        context_id: 2,
        user_id: 8,
        integration_training_mode: false,
      });
      prisma.report_integration_event.findMany.mockResolvedValue([
        {
          id: 31,
          report_id: 101,
          external_event_id: null,
          status: 'processing',
          environment: 'production',
          attempt_count: 0,
          last_attempt_at: null,
          last_error: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
      prisma.integration_config.findFirst.mockResolvedValue(null);

      const list = await service.findEventsByParticipationForUser(3, 8);

      expect(list).toHaveLength(1);
      expect(list[0].externalSignalStageId).toBeNull();
      expect(list[0].externalSignalStageLabel).toBeNull();
      expect(ephemClient.listSignals).not.toHaveBeenCalled();
    });
  });

  describe('upsertConfig', () => {
    it('cria primeira versão quando não existe config', async () => {
      prisma.integration_config.findFirst.mockResolvedValue(null);
      const now = new Date();
      prisma.integration_config.create.mockResolvedValue({
        id: 1,
        context_id: 10,
        version: 1,
        is_active: true,
        base_url_production: 'https://prod',
        base_url_homologation: 'https://hom',
        auth_config: { type: 'static_token', token: 'sec' },
        payload_mapping: { templateId: '/1' },
        timeout_ms: 15000,
        max_retries: 5,
        created_at: now,
        updated_at: now,
      });

      const dto = Object.assign(new UpsertIntegrationConfigDto(), {
        isActive: true,
        baseUrlProduction: 'https://prod',
        baseUrlHomologation: 'https://hom',
        authConfig: { type: 'static_token', token: 'sec' },
        timeoutMs: 15000,
        maxRetries: 5,
      });

      const res = await service.upsertConfig(10, dto, 1);
      expect(res.version).toBe(1);
      expect(prisma.integration_config.create).toHaveBeenCalled();
    });

    it('desativa config anterior e incrementa versão', async () => {
      prisma.integration_config.findFirst.mockResolvedValue({
        id: 5,
        version: 3,
        is_active: true,
        auth_config: { token: 'old' },
        payload_mapping: {
          templateId: '/1',
          templateFieldKey: 'eventoIntegracaoTemplate',
        },
      });
      prisma.integration_config.update.mockResolvedValue({});
      const now = new Date();
      prisma.integration_config.create.mockResolvedValue({
        id: 6,
        context_id: 10,
        version: 4,
        is_active: true,
        base_url_production: 'https://new',
        base_url_homologation: null,
        auth_config: { token: 'new' },
        payload_mapping: { templateId: '/2' },
        timeout_ms: 30000,
        max_retries: 3,
        created_at: now,
        updated_at: now,
      });

      const dto = Object.assign(new UpsertIntegrationConfigDto(), {
        templateId: '/2',
        baseUrlProduction: 'https://new',
      });

      const res = await service.upsertConfig(10, dto, 1);
      expect(prisma.integration_config.update).toHaveBeenCalled();
      expect(res.version).toBe(4);
      expect(res.templateId).toBe('/2');
    });

    it('regista auditoria com contexto de pedido opcional', async () => {
      prisma.integration_config.findFirst.mockResolvedValue(null);
      const now = new Date();
      prisma.integration_config.create.mockResolvedValue({
        id: 99,
        context_id: 11,
        version: 1,
        is_active: true,
        base_url_production: 'https://p',
        base_url_homologation: null,
        auth_config: null,
        payload_mapping: {},
        timeout_ms: 30000,
        max_retries: 3,
        created_at: now,
        updated_at: now,
      });

      const dto = Object.assign(new UpsertIntegrationConfigDto(), {
        baseUrlProduction: 'https://p',
      });

      await service.upsertConfig(11, dto, 5, {
        ipAddress: '10.0.0.1',
      } as any);

      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INTEGRATION_CONFIG_UPDATE',
          actor: { userId: 5 },
          contextId: 11,
          request: expect.objectContaining({ ipAddress: '10.0.0.1' }),
          metadata: expect.objectContaining({
            version: 1,
            previousVersion: null,
          }),
        }),
      );
    });
  });
});
