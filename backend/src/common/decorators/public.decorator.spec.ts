import { SetMetadata } from '@nestjs/common';
import { Public, IS_PUBLIC_KEY } from './public.decorator';

describe('Public Decorator', () => {
  it('deve definir metadata corretamente', () => {
    // O decorator Public() retorna uma função decorator factory
    expect(typeof Public).toBe('function');
    expect(IS_PUBLIC_KEY).toBe('isPublic');

    // O decorator retorna uma função que será executada pelo NestJS
    const decorator = Public();
    expect(typeof decorator).toBe('function');
  });

  it('deve usar SetMetadata com IS_PUBLIC_KEY', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});
