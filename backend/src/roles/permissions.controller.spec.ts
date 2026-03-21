import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { RolesService } from './roles.service';
import { RolesGuard } from '../authz/guards/roles.guard';

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let rolesService: RolesService;

  const mockPermissions = [
    {
      id: 1,
      code: 'content:read',
      name: 'Ler conteúdo',
      description: null,
      active: true,
    },
    {
      id: 2,
      code: 'content:write',
      name: 'Escrever conteúdo',
      description: null,
      active: true,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        {
          provide: RolesService,
          useValue: {
            findAllPermissions: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<PermissionsController>(PermissionsController);
    rolesService = module.get<RolesService>(RolesService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar lista de permissões', async () => {
      jest
        .spyOn(rolesService, 'findAllPermissions')
        .mockResolvedValue(mockPermissions as any);

      const result = await controller.findAll();

      expect(result).toEqual(mockPermissions);
      expect(rolesService.findAllPermissions).toHaveBeenCalled();
    });
  });
});
