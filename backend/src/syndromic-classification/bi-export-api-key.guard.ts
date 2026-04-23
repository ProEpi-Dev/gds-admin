import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { BiExportApiKeyService } from './bi-export-api-key.service';

@Injectable()
export class BiExportApiKeyGuard implements CanActivate {
  constructor(private readonly biExportApiKeyService: BiExportApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, unknown>;
      biExportKeyContextId?: number;
    }>();
    const raw = req.headers['x-api-key'] ?? req.headers['X-Api-Key'];
    let apiKeyHeader: string | undefined;
    if (typeof raw === 'string') {
      apiKeyHeader = raw;
    } else if (Array.isArray(raw)) {
      apiKeyHeader = raw[0];
    } else {
      apiKeyHeader = undefined;
    }
    const result = await this.biExportApiKeyService.validateApiKeyHeader(
      apiKeyHeader,
    );
    if (!result) {
      throw new UnauthorizedException(
        'Chave de API inválida ou ausente (cabeçalho x-api-key, formato publicId.secret).',
      );
    }
    req.biExportKeyContextId = result.contextId;
    return true;
  }
}
