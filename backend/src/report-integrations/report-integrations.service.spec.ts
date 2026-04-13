import { Test, TestingModule } from '@nestjs/testing';
import { ReportIntegrationsService } from './report-integrations.service';
import { EphemClient } from './ephem.client';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ReportIntegrationsService', () => {
  let service: ReportIntegrationsService;
  let prisma: any;
  let ephemClient: any;

  beforeEach(async () => {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportIntegrationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EphemClient, useValue: ephemClient },
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
  });

  describe('findEventByReportId', () => {
    it('deve retornar null se não existir', async () => {
      prisma.report_integration_event.findUnique.mockResolvedValue(null);
      expect(await service.findEventByReportId(999)).toBeNull();
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

      const result = await service.findEventByReportId(10);
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

      const result = await service.findEventByReportId(10);
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
  });
});
