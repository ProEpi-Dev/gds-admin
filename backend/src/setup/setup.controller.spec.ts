import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';
import { SetupDto } from './dto/setup.dto';
import { SetupResponseDto } from './dto/setup-response.dto';

describe('SetupController', () => {
  let controller: SetupController;
  let setupService: SetupService;

  const mockSetupDto: SetupDto = {
    managerName: 'Admin User',
    managerEmail: 'admin@example.com',
    managerPassword: 'password123',
    contextName: 'Contexto Principal',
    contextDescription: 'Contexto padrão',
  };

  const mockSetupResponse: SetupResponseDto = {
    message: 'Sistema inicializado com sucesso',
    context: {
      id: 1,
      name: 'Contexto Principal',
      description: 'Contexto padrão',
      accessType: 'PUBLIC',
      active: true,
    },
    manager: {
      id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    contextManager: {
      id: 1,
      userId: 1,
      contextId: 1,
      active: true,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetupController],
      providers: [
        {
          provide: SetupService,
          useValue: {
            setup: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SetupController>(SetupController);
    setupService = module.get<SetupService>(SetupService);
  });

  describe('setup', () => {
    it('deve criar contexto e manager com sucesso', async () => {
      jest.spyOn(setupService, 'setup').mockResolvedValue(mockSetupResponse);

      const result = await controller.setup(mockSetupDto);

      expect(result).toEqual(mockSetupResponse);
      expect(setupService.setup).toHaveBeenCalledWith(mockSetupDto);
    });

    it('deve lançar BadRequestException quando já foi inicializado', async () => {
      jest
        .spyOn(setupService, 'setup')
        .mockRejectedValue(new BadRequestException('Sistema já foi inicializado'));

      await expect(controller.setup(mockSetupDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando email já existe', async () => {
      jest
        .spyOn(setupService, 'setup')
        .mockRejectedValue(new BadRequestException('Já existe um usuário com o email'));

      await expect(controller.setup(mockSetupDto)).rejects.toThrow(BadRequestException);
    });
  });
});

