import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateParticipationDto } from './create-participation.dto';

describe('CreateParticipationDto', () => {
  it('aceita userId existente e converte tipos', async () => {
    const instance = plainToInstance(CreateParticipationDto, {
      userId: '10',
      contextId: '1',
      startDate: '2024-01-01',
      roleId: '3',
    });
    expect(instance.userId).toBe(10);
    expect(instance.contextId).toBe(1);
    expect(instance.roleId).toBe(3);
    expect(await validate(instance)).toHaveLength(0);
  });

  it('exige newUser* quando não há userId', async () => {
    const instance = plainToInstance(CreateParticipationDto, {
      contextId: 1,
      startDate: '2024-01-01',
    });
    expect(await validate(instance)).not.toHaveLength(0);
  });

  it('aceita criação inline de usuário', async () => {
    const instance = plainToInstance(CreateParticipationDto, {
      contextId: 1,
      startDate: '2024-01-01',
      newUserName: 'Novo',
      newUserEmail: 'novo@example.com',
      newUserPassword: 'senha12',
      endDate: '2024-12-31',
      active: true,
    });
    expect(await validate(instance)).toHaveLength(0);
  });
});
