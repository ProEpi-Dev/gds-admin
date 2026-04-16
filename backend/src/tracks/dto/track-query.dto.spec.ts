import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TrackQueryDto } from './track-query.dto';

describe('TrackQueryDto', () => {
  it('converte contextId opcional de string', async () => {
    const instance = plainToInstance(TrackQueryDto, { contextId: '5' });
    expect(instance.contextId).toBe(5);
    expect(await validate(instance)).toHaveLength(0);
  });
});
