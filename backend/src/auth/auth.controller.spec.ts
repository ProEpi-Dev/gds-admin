import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockLoginResponse = {
    token: 'mockToken',
    user: {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    participation: null,
    defaultForms: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            changePassword: jest.fn(),
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('deve retornar token e dados do usuário quando credenciais são válidas', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(authService, 'login').mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockLoginResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('deve lançar UnauthorizedException quando credenciais são inválidas', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('deve alterar senha quando dados são válidos', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };

      const mockUser = { userId: 1, email: 'test@example.com' };

      jest.spyOn(authService, 'changePassword').mockResolvedValue(undefined);

      await controller.changePassword(changePasswordDto, mockUser);

      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUser.userId,
        changePasswordDto,
      );
    });

    it('deve lançar UnauthorizedException quando senha atual está incorreta', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      };

      const mockUser = { userId: 1, email: 'test@example.com' };

      jest
        .spyOn(authService, 'changePassword')
        .mockRejectedValue(new UnauthorizedException('Senha atual incorreta'));

      await expect(
        controller.changePassword(changePasswordDto, mockUser),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar BadRequestException quando nova senha é igual à atual', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'oldPassword',
      };

      const mockUser = { userId: 1, email: 'test@example.com' };

      jest
        .spyOn(authService, 'changePassword')
        .mockRejectedValue(
          new BadRequestException(
            'A nova senha deve ser diferente da senha atual',
          ),
        );

      await expect(
        controller.changePassword(changePasswordDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    it('deve retornar mensagem genérica', async () => {
      const dto = { email: 'user@example.com' };
      const message = {
        message:
          'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.',
      };
      jest
        .spyOn(authService, 'requestPasswordReset')
        .mockResolvedValue(message);

      const result = await controller.forgotPassword(dto);

      expect(result).toEqual(message);
      expect(authService.requestPasswordReset).toHaveBeenCalledWith(dto.email);
    });
  });

  describe('resetPassword', () => {
    it('deve retornar 204 quando token e senha são válidos', async () => {
      const dto = { token: 'valid-token', newPassword: 'NewPass123' };
      jest.spyOn(authService, 'resetPassword').mockResolvedValue(undefined);

      await controller.resetPassword(dto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        dto.token,
        dto.newPassword,
      );
    });

    it('deve lançar BadRequestException quando token é inválido', async () => {
      const dto = { token: 'invalid-token', newPassword: 'NewPass123' };
      jest
        .spyOn(authService, 'resetPassword')
        .mockRejectedValue(
          new BadRequestException('Link inválido ou expirado'),
        );

      await expect(controller.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
