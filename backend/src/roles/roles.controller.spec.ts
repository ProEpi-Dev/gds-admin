import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RolesGuard } from '../authz/guards/roles.guard';

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: RolesService;

  const mockRoles = [
    {
      id: 1,
      code: 'admin',
      name: 'Administrador',
      description: 'Acesso total',
      scope: 'global',
      active: true,
    },
    {
      id: 2,
      code: 'manager',
      name: 'Gerente',
      description: null,
      scope: 'context',
      active: true,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<RolesController>(RolesController);
    rolesService = module.get<RolesService>(RolesService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar lista de papéis', async () => {
      jest.spyOn(rolesService, 'findAll').mockResolvedValue(mockRoles as any);

      const result = await controller.findAll();

      expect(result).toEqual(mockRoles);
      expect(rolesService.findAll).toHaveBeenCalled();
    });
  });
});
