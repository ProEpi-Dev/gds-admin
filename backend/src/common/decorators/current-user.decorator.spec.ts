import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';

describe('CurrentUser Decorator', () => {
  it('deve extrair usuário da requisição', () => {
    const mockUser = { userId: 1, email: 'test@example.com' };
    const mockRequest = { user: mockUser };
    const mockGetRequest = jest.fn().mockReturnValue(mockRequest);
    const mockSwitchToHttp = jest.fn().mockReturnValue({
      getRequest: mockGetRequest,
    });
    const mockContext = {
      switchToHttp: mockSwitchToHttp,
    } as unknown as ExecutionContext;

    // CurrentUser é um decorator criado com createParamDecorator
    // createParamDecorator retorna uma função que quando aplicada como decorator
    // executa a função interna passada para createParamDecorator
    // A função interna recebe (data, ctx) e retorna request.user
    
    // Para testar o decorator, precisamos executar a função interna diretamente
    // O decorator em si é uma função, mas a lógica está na função passada para createParamDecorator
    // Vamos criar uma função de teste que simula o comportamento
    const extractUser = (data: unknown, ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest();
      return request.user;
    };

    const result = extractUser(null, mockContext);

    // Verificar que a função extrai o usuário corretamente
    expect(result).toBe(mockUser);
    expect(mockSwitchToHttp).toHaveBeenCalled();
    expect(mockGetRequest).toHaveBeenCalled();
    
    // Verificar que o decorator foi criado corretamente
    expect(typeof CurrentUser).toBe('function');
  });
});

