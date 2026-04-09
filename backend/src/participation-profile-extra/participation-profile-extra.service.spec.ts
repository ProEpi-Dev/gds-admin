import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ParticipationProfileExtraService } from './participation-profile-extra.service';
import { PrismaService } from '../prisma/prisma.service';
import { form_type_enum } from '@prisma/client';

describe('ParticipationProfileExtraService', () => {
  let service: ParticipationProfileExtraService;
  let prisma: {
    participation: { findMany: jest.Mock };
    form: { findFirst: jest.Mock };
    participation_profile_extra: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    form_version: { findUnique: jest.Mock };
  };

  const activeParticipation = {
    id: 10,
    user_id: 1,
    context_id: 100,
    start_date: new Date('2020-01-01'),
    end_date: null,
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const profileFormWithVersion = {
    id: 50,
    title: 'Extra',
    reference: 'REF',
    type: form_type_enum.profile_extra,
    context_id: 100,
    active: true,
    form_version: [
      {
        id: 200,
        form_id: 50,
        version_number: 1,
        access_type: 'PUBLIC',
        definition: { fields: [{ id: '1', name: 'a', type: 'text', label: 'A' }] },
        active: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        passing_score: null,
        max_attempts: null,
        time_limit_minutes: null,
        show_feedback: null,
        randomize_questions: null,
      },
    ],
  };

  beforeEach(async () => {
    const mockPrisma = {
      participation: { findMany: jest.fn() },
      form: { findFirst: jest.fn() },
      participation_profile_extra: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      form_version: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipationProfileExtraService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ParticipationProfileExtraService);
    prisma = module.get(PrismaService) as typeof prisma;
  });

  describe('getProfileExtraCompletion', () => {
    it('deve retornar não obrigatório quando não há participação ativa', async () => {
      prisma.participation.findMany.mockResolvedValue([]);
      await expect(service.getProfileExtraCompletion(1)).resolves.toEqual({
        required: false,
        complete: true,
      });
    });

    it('deve ignorar participação com start_date no futuro', async () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 2);
      prisma.participation.findMany.mockResolvedValue([
        { ...activeParticipation, start_date: farFuture },
      ]);
      await expect(service.getProfileExtraCompletion(1)).resolves.toEqual({
        required: false,
        complete: true,
      });
    });

    it('deve ignorar participação com end_date no passado', async () => {
      prisma.participation.findMany.mockResolvedValue([
        {
          ...activeParticipation,
          end_date: new Date('2000-01-01'),
        },
      ]);
      await expect(service.getProfileExtraCompletion(1)).resolves.toEqual({
        required: false,
        complete: true,
      });
    });

    it('deve retornar não obrigatório quando não existe formulário profile_extra', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue(null);
      await expect(service.getProfileExtraCompletion(1)).resolves.toEqual({
        required: false,
        complete: true,
      });
    });

    it('deve retornar não obrigatório quando não há versão ativa', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue({
        ...profileFormWithVersion,
        form_version: [],
      });
      await expect(service.getProfileExtraCompletion(1)).resolves.toEqual({
        required: false,
        complete: true,
      });
    });

    it('deve retornar não obrigatório quando a versão não tem campos', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue({
        ...profileFormWithVersion,
        form_version: [
          {
            ...profileFormWithVersion.form_version[0],
            definition: { fields: [] },
          },
        ],
      });
      await expect(service.getProfileExtraCompletion(1)).resolves.toEqual({
        required: false,
        complete: true,
      });
    });

    it('deve exigir preenchimento quando não há submissão', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue(profileFormWithVersion);
      prisma.participation_profile_extra.findUnique.mockResolvedValue(null);
      await expect(service.getProfileExtraCompletion(1)).resolves.toEqual({
        required: true,
        complete: false,
      });
    });

    it('deve considerar incompleto quando submissão é de outra versão', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue(profileFormWithVersion);
      prisma.participation_profile_extra.findUnique.mockResolvedValue({
        form_version_id: 999,
        active: true,
      });
      await expect(service.getProfileExtraCompletion(1)).resolves.toEqual({
        required: true,
        complete: false,
      });
    });

    it('deve considerar incompleto quando submissão está inativa', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue(profileFormWithVersion);
      prisma.participation_profile_extra.findUnique.mockResolvedValue({
        form_version_id: 200,
        active: false,
      });
      await expect(service.getProfileExtraCompletion(1)).resolves.toEqual({
        required: true,
        complete: false,
      });
    });

    it('deve considerar completo quando submissão alinhada à versão atual', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue(profileFormWithVersion);
      prisma.participation_profile_extra.findUnique.mockResolvedValue({
        form_version_id: 200,
        active: true,
      });
      await expect(service.getProfileExtraCompletion(1)).resolves.toEqual({
        required: true,
        complete: true,
      });
    });
  });

  describe('getMe', () => {
    it('deve retornar null quando não há participação ativa', async () => {
      prisma.participation.findMany.mockResolvedValue([]);
      await expect(service.getMe(1)).resolves.toEqual({
        form: null,
        submission: null,
      });
    });

    it('deve retornar null quando não há formulário', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue(null);
      await expect(service.getMe(1)).resolves.toEqual({
        form: null,
        submission: null,
      });
    });

    it('deve retornar null quando versão sem campos', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue({
        ...profileFormWithVersion,
        form_version: [
          {
            ...profileFormWithVersion.form_version[0],
            definition: { fields: [] },
          },
        ],
      });
      await expect(service.getMe(1)).resolves.toEqual({
        form: null,
        submission: null,
      });
    });

    it('deve retornar form e submission null quando não há linha salva', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue(profileFormWithVersion);
      prisma.participation_profile_extra.findUnique.mockResolvedValue(null);
      const result = await service.getMe(1);
      expect(result.form).toMatchObject({
        id: 50,
        title: 'Extra',
        type: form_type_enum.profile_extra,
      });
      expect(result.form?.version.passingScore).toBeNull();
      expect(result.submission).toBeNull();
    });

    it('deve mapear passingScore quando definido e ignorar submission inativa', async () => {
      const fv = {
        ...profileFormWithVersion.form_version[0],
        passing_score: 70.5,
        show_feedback: false,
        randomize_questions: true,
      };
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue({
        ...profileFormWithVersion,
        form_version: [fv],
      });
      prisma.participation_profile_extra.findUnique.mockResolvedValue({
        form_version_id: 200,
        response: { a: '1' },
        updated_at: new Date('2024-06-01'),
        active: false,
      });
      const result = await service.getMe(1);
      expect(result.form?.version.passingScore).toBe(70.5);
      expect(result.form?.version.showFeedback).toBe(false);
      expect(result.form?.version.randomizeQuestions).toBe(true);
      expect(result.submission).toBeNull();
    });

    it('deve retornar submission quando ativa', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form.findFirst.mockResolvedValue(profileFormWithVersion);
      prisma.participation_profile_extra.findUnique.mockResolvedValue({
        form_version_id: 200,
        response: { field: 'x' },
        updated_at: new Date('2024-06-01'),
        active: true,
      });
      const result = await service.getMe(1);
      expect(result.submission).toEqual({
        formVersionId: 200,
        response: { field: 'x' },
        updatedAt: new Date('2024-06-01'),
      });
    });
  });

  describe('saveMe', () => {
    const dto = { formVersionId: 200, formResponse: { a: 1 } };

    it('deve lançar BadRequestException sem participação ativa', async () => {
      prisma.participation.findMany.mockResolvedValue([]);
      await expect(service.saveMe(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando versão não existe', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form_version.findUnique.mockResolvedValue(null);
      await expect(service.saveMe(1, dto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException quando versão está inativa', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form_version.findUnique.mockResolvedValue({
        id: 200,
        active: false,
        form: { type: form_type_enum.profile_extra, context_id: 100, active: true },
      });
      await expect(service.saveMe(1, dto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando formulário não é profile_extra', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form_version.findUnique.mockResolvedValue({
        id: 200,
        active: true,
        form_id: 1,
        form: {
          type: form_type_enum.quiz,
          context_id: 100,
          active: true,
        },
      });
      await expect(service.saveMe(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar ForbiddenException quando contexto difere', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form_version.findUnique.mockResolvedValue({
        id: 200,
        active: true,
        form_id: 50,
        form: {
          type: form_type_enum.profile_extra,
          context_id: 999,
          active: true,
        },
      });
      await expect(service.saveMe(1, dto)).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar BadRequestException quando formulário inativo', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form_version.findUnique.mockResolvedValue({
        id: 200,
        active: true,
        form_id: 50,
        form: {
          type: form_type_enum.profile_extra,
          context_id: 100,
          active: false,
        },
      });
      await expect(service.saveMe(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('deve fazer upsert e retornar submissão', async () => {
      prisma.participation.findMany.mockResolvedValue([activeParticipation]);
      prisma.form_version.findUnique.mockResolvedValue({
        id: 200,
        active: true,
        form_id: 50,
        form: {
          type: form_type_enum.profile_extra,
          context_id: 100,
          active: true,
        },
      });
      const updatedAt = new Date('2024-07-01');
      prisma.participation_profile_extra.upsert.mockResolvedValue({
        form_version_id: 200,
        response: { a: 1 },
        updated_at: updatedAt,
      });
      const result = await service.saveMe(1, dto);
      expect(result).toEqual({
        formVersionId: 200,
        response: { a: 1 },
        updatedAt,
      });
      expect(prisma.participation_profile_extra.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            participation_id_form_id: {
              participation_id: 10,
              form_id: 50,
            },
          },
          create: expect.objectContaining({
            participation_id: 10,
            form_id: 50,
            form_version_id: 200,
            response: { a: 1 },
            active: true,
          }),
          update: expect.objectContaining({
            form_version_id: 200,
            response: { a: 1 },
            active: true,
          }),
        }),
      );
    });
  });
});
