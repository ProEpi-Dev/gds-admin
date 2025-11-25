import { BadRequestException } from '@nestjs/common';
import { ValidationPipe } from './validation.pipe';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

jest.mock('class-validator');
jest.mock('class-transformer');

class TestDto {
  name: string;
  email: string;
}

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe();
  });

  describe('transform', () => {
    it('deve validar DTO quando metatype é fornecido', async () => {
      const value = { name: 'Test', email: 'test@example.com' };
      const metadata = { metatype: TestDto };

      (plainToInstance as jest.Mock).mockReturnValue(value);
      (validate as jest.Mock).mockResolvedValue([]);

      const result = await pipe.transform(value, metadata as any);

      expect(plainToInstance).toHaveBeenCalledWith(TestDto, value);
      expect(validate).toHaveBeenCalledWith(value);
      expect(result).toBe(value);
    });

    it('deve retornar valor quando metatype não é validável', async () => {
      const value = { name: 'Test' };
      const metadata = { metatype: String };

      const result = await pipe.transform(value, metadata as any);

      expect(result).toBe(value);
      // Quando metatype não é validável, o pipe retorna o valor diretamente
      // sem chamar plainToInstance ou validate
    });

    it('deve lançar BadRequestException quando validação falha', async () => {
      const value = { name: 'Test' };
      const metadata = { metatype: TestDto };
      const errors = [
        {
          constraints: {
            isEmail: 'email must be an email',
          },
        },
      ];

      (plainToInstance as jest.Mock).mockReturnValue(value);
      (validate as jest.Mock).mockResolvedValue(errors);

      await expect(pipe.transform(value, metadata as any)).rejects.toThrow(BadRequestException);
    });

    it('deve retornar objeto transformado quando válido', async () => {
      const value = { name: 'Test', email: 'test@example.com' };
      const metadata = { metatype: TestDto };
      const transformedValue = { name: 'Test', email: 'test@example.com' };

      (plainToInstance as jest.Mock).mockReturnValue(transformedValue);
      (validate as jest.Mock).mockResolvedValue([]);

      const result = await pipe.transform(value, metadata as any);

      expect(result).toBe(transformedValue);
    });
  });

  describe('toValidate', () => {
    it('deve retornar false para tipos primitivos', () => {
      const pipe = new ValidationPipe() as any;
      expect(pipe.toValidate(String)).toBe(false);
      expect(pipe.toValidate(Boolean)).toBe(false);
      expect(pipe.toValidate(Number)).toBe(false);
      expect(pipe.toValidate(Array)).toBe(false);
      expect(pipe.toValidate(Object)).toBe(false);
    });

    it('deve retornar true para classes customizadas', () => {
      const pipe = new ValidationPipe() as any;
      expect(pipe.toValidate(TestDto)).toBe(true);
    });
  });
});

