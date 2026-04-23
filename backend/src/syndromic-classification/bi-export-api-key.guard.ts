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
    const result = await this.biExportApiKeyService.validateApiKeyHeader(
      typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined,
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
