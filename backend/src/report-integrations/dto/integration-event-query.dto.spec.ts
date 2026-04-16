import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IntegrationEventQueryDto } from './integration-event-query.dto';

describe('IntegrationEventQueryDto', () => {
  it('transforma contextId de string para número', () => {
    const instance = plainToInstance(IntegrationEventQueryDto, {
      contextId: '42',
    });
    expect(instance.contextId).toBe(42);
  });

  it('mantém undefined quando contextId não veio no payload', () => {
    const instance = plainToInstance(IntegrationEventQueryDto, {});
    expect(instance.contextId).toBeUndefined();
  });

  it('aceita status do enum', async () => {
    const instance = plainToInstance(IntegrationEventQueryDto, {
      status: 'pending',
    });
    expect(await validate(instance)).toHaveLength(0);
  });
});
