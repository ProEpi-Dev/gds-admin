import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';
import { BCRYPT_ROUNDS } from '../auth/constants/password.constants';
import type {
  CreateBiExportApiKeyDto,
  BiExportApiKeyListItemDto,
} from './dto/bi-export-api-key.dto';

@Injectable()
export class BiExportApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
  ) {}

  private get keyModel() {
    return (this.prisma as any).syndrome_bi_export_api_key;
  }

  private async assertCanManageKeys(
    userId: number,
    contextId: number,
  ): Promise<void> {
    if (await this.authz.isAdmin(userId)) {
      return;
    }
    const ok = await this.authz.hasAnyRole(userId, contextId, ['manager']);
    if (!ok) {
      throw new ForbiddenException(
        'Sem permissão para gerenciar chaves de API neste contexto',
      );
    }
  }

  async listForContext(
    contextId: number,
    userId: number,
  ): Promise<BiExportApiKeyListItemDto[]> {
    await this.assertCanManageKeys(userId, contextId);
    const rows = await this.keyModel.findMany({
      where: { context_id: contextId },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      select: {
        public_id: true,
        name: true,
        context_id: true,
        created_at: true,
        revoked_at: true,
        last_used_at: true,
      },
    });
    return rows.map((r: any) => ({
      publicId: r.public_id,
      name: r.name,
      contextId: r.context_id,
      createdAt: r.created_at,
      revokedAt: r.revoked_at ?? null,
      lastUsedAt: r.last_used_at ?? null,
    }));
  }

  async create(
    dto: CreateBiExportApiKeyDto,
    userId: number,
  ): Promise<{
    apiKey: string;
    publicId: string;
    name: string;
    contextId: number;
    createdAt: Date;
  }> {
    await this.assertCanManageKeys(userId, dto.contextId);

    const publicId = randomUUID();
    const secretPlain = randomBytes(32).toString('base64url');
    const secretHash = await bcrypt.hash(secretPlain, BCRYPT_ROUNDS);
    const apiKey = `${publicId}.${secretPlain}`;

    const created = await this.keyModel.create({
      data: {
        public_id: publicId,
        context_id: dto.contextId,
        name: dto.name.trim(),
        secret_hash: secretHash,
        created_by_user_id: userId,
      },
      select: {
        public_id: true,
        name: true,
        context_id: true,
        created_at: true,
      },
    });

    return {
      apiKey,
      publicId: created.public_id,
      name: created.name,
      contextId: created.context_id,
      createdAt: created.created_at,
    };
  }

  async revoke(publicId: string, userId: number): Promise<void> {
    const row = await this.keyModel.findUnique({
      where: { public_id: publicId },
      select: { context_id: true, revoked_at: true },
    });
    if (!row) {
      throw new NotFoundException('Chave não encontrada');
    }
    if (row.revoked_at) {
      return;
    }
    await this.assertCanManageKeys(userId, row.context_id);
    await this.keyModel.update({
      where: { public_id: publicId },
      data: {
        active: false,
        revoked_at: new Date(),
      },
    });
  }

  /**
   * Valida cabeçalho x-api-key e retorna o context_id vinculado à chave.
   */
  async validateApiKeyHeader(rawHeader: string | undefined): Promise<{
    contextId: number;
  } | null> {
    const trimmed =
      typeof rawHeader === 'string'
        ? rawHeader.trim()
        : Array.isArray(rawHeader)
          ? String(rawHeader[0] ?? '').trim()
          : '';
    if (!trimmed) {
      return null;
    }
    const dot = trimmed.indexOf('.');
    if (dot <= 0 || dot >= trimmed.length - 1) {
      return null;
    }
    const publicId = trimmed.slice(0, dot);
    const secretPlain = trimmed.slice(dot + 1);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(publicId)) {
      return null;
    }
    if (secretPlain.length < 16) {
      return null;
    }

    const row = await this.keyModel.findFirst({
      where: {
        public_id: publicId,
        active: true,
        revoked_at: null,
      },
      select: { secret_hash: true, context_id: true },
    });
    if (!row) {
      return null;
    }
    const ok = await bcrypt.compare(secretPlain, row.secret_hash);
    if (!ok) {
      return null;
    }

    void this.keyModel
      .update({
        where: { public_id: publicId },
        data: { last_used_at: new Date() },
      })
      .catch(() => undefined);

    return { contextId: row.context_id };
  }
}
