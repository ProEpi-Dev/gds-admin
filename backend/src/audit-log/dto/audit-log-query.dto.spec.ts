import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuditLogQueryDto } from './audit-log-query.dto';

describe('AuditLogQueryDto', () => {
  it('converte page e pageSize de string para número', () => {
    const instance = plainToInstance(AuditLogQueryDto, {
      page: '3',
      pageSize: '15',
    });
    expect(instance.page).toBe(3);
    expect(instance.pageSize).toBe(15);
  });

  it('aceita filtros e ordenação válidos', async () => {
    const instance = plainToInstance(AuditLogQueryDto, {
      action: 'USER_ROLE_CHANGE',
      targetEntityType: 'user',
      actorUserId: '9',
      contextId: '2',
      dateFrom: '2024-01-01T00:00:00.000Z',
      dateTo: '2024-12-31T23:59:59.999Z',
      search: 'admin',
      sortDirection: 'asc',
    });
    expect(await validate(instance)).toHaveLength(0);
  });
});
