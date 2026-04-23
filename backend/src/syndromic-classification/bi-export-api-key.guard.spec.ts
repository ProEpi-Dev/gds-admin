import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { BiExportApiKeyGuard } from './bi-export-api-key.guard';
import { BiExportApiKeyService } from './bi-export-api-key.service';

function mockExecutionContext(headers: Record<string, string | string[] | undefined>) {
  const req: { headers: typeof headers; biExportKeyContextId?: number } = {
    headers,
  };
  return {
    req,
    ctx: {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as ExecutionContext,
  };
}

describe('BiExportApiKeyGuard', () => {
  it('401 quando serviço não valida', async () => {
    const service = {
      validateApiKeyHeader: jest.fn().mockResolvedValue(null),
    };
    const guard = new BiExportApiKeyGuard(service as unknown as BiExportApiKeyService);
    const { ctx } = mockExecutionContext({ 'x-api-key': 'x.y' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('define biExportKeyContextId quando válido', async () => {
    const service = {
      validateApiKeyHeader: jest.fn().mockResolvedValue({ contextId: 7 }),
    };
    const guard = new BiExportApiKeyGuard(service as unknown as BiExportApiKeyService);
    const { ctx, req } = mockExecutionContext({ 'x-api-key': 'uuid.secret' });
    await guard.canActivate(ctx);
    expect(req.biExportKeyContextId).toBe(7);
  });
});
