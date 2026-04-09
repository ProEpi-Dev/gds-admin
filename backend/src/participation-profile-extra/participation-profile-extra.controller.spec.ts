import { Test, TestingModule } from '@nestjs/testing';
import { ParticipationProfileExtraController } from './participation-profile-extra.controller';
import { ParticipationProfileExtraService } from './participation-profile-extra.service';
import { SaveParticipationProfileExtraDto } from './dto/save-participation-profile-extra.dto';
import { form_type_enum } from '@prisma/client';

describe('ParticipationProfileExtraController', () => {
  let controller: ParticipationProfileExtraController;
  let service: ParticipationProfileExtraService;

  const mockUser = { userId: 42 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParticipationProfileExtraController],
      providers: [
        {
          provide: ParticipationProfileExtraService,
          useValue: {
            getMe: jest.fn(),
            saveMe: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ParticipationProfileExtraController);
    service = module.get(ParticipationProfileExtraService);
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('deve delegar ao service com userId do token', async () => {
      const payload = {
        form: {
          id: 1,
          title: 'F',
          reference: null,
          type: form_type_enum.profile_extra,
          version: {
            id: 2,
            formId: 1,
            versionNumber: 1,
            accessType: 'PUBLIC' as const,
            definition: { fields: [] },
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        submission: null,
      };
      jest.spyOn(service, 'getMe').mockResolvedValue(payload as any);

      const result = await controller.getMe(mockUser);

      expect(service.getMe).toHaveBeenCalledWith(42);
      expect(result).toEqual(payload);
    });
  });

  describe('saveMe', () => {
    it('deve delegar ao service com body e userId', async () => {
      const body: SaveParticipationProfileExtraDto = {
        formVersionId: 5,
        formResponse: { x: 'y' },
      };
      const saved = {
        formVersionId: 5,
        response: { x: 'y' },
        updatedAt: new Date(),
      };
      jest.spyOn(service, 'saveMe').mockResolvedValue(saved);

      const result = await controller.saveMe(mockUser, body);

      expect(service.saveMe).toHaveBeenCalledWith(42, body);
      expect(result).toEqual(saved);
    });
  });
});
