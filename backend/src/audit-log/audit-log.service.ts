import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationLinks,
  createPaginationMeta,
} from '../common/helpers/pagination.helper';

export type AuditAction =
  | 'PARTICIPATION_SOFT_DELETE'
  | 'PARTICIPATION_REACTIVATE'
  | 'PARTICIPATION_PERMANENT_DELETE'
  | 'CONTEXT_CREATE'
  | 'CONTEXT_UPDATE'
  | 'CONTEXT_SOFT_DELETE'
  | 'CONTEXT_CONFIGURATION_UPDATE'
  | 'USER_ROLE_CHANGE'
  | 'PARTICIPATION_ROLE_ADD'
  | 'PARTICIPATION_ROLE_REMOVE'
  | 'INTEGRATION_CONFIG_UPDATE'
  | 'SYNDROME_CONFIG_CREATE'
  | 'SYNDROME_CONFIG_UPDATE'
  | 'SYNDROME_CONFIG_DELETE'
  | 'SYNDROME_MATRIX_UPDATE'
  | 'SYNDROME_REPROCESS_TRIGGER';

export type AuditTargetEntityType =
  | 'participation'
  | 'content'
  | 'user'
  | 'context'
  | 'context_configuration'
  | 'integration_config'
  | 'symptom'
  | 'syndrome'
  | 'syndrome_form_config'
  | 'form_symptom_mapping'
  | 'syndrome_symptom_weight'
  | 'report_syndrome_score'
  | 'other';

export interface AuditActor {
  userId: number | null;
}

export interface AuditRequestContext {
  requestId?: string | null;
  channel?: 'web' | 'app' | 'api' | 'system' | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogInput {
  action: AuditAction;
  targetEntityType: AuditTargetEntityType;
  targetEntityId: number | string;
  actor: AuditActor;
  contextId?: number | null;
  targetUserId?: number | null;
  metadata?: Record<string, unknown> | null;
  request?: AuditRequestContext | null;
  occurredAt?: Date;
}

type PrismaRawExecutor = Pick<PrismaService, '$executeRaw'> | Prisma.TransactionClient;

type AuditLogCountRow = { total: number };
type AuditLogRawRow = {
  id: number;
  action: string;
  target_entity_type: string;
  target_entity_id: string;
  actor_user_id: number | null;
  actor_name: string | null;
  actor_email: string | null;
  context_id: number | null;
  context_name: string | null;
  target_user_id: number | null;
  target_user_name: string | null;
  target_user_email: string | null;
  request_id: string | null;
  channel: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  occurred_at: Date;
};

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput): Promise<void> {
    await this.insert(this.prisma, input);
  }

  async recordWithTx(tx: Prisma.TransactionClient, input: AuditLogInput): Promise<void> {
    await this.insert(tx, input);
  }

  async recordMany(inputs: AuditLogInput[]): Promise<void> {
    for (const input of inputs) {
      await this.insert(this.prisma, input);
    }
  }

  async findAll(query: AuditLogQueryDto): Promise<ListResponseDto<AuditLogResponseDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = query.search?.trim();

    const whereConditions = this.buildAuditLogWhereSqlFragments(query, searchTerm);
    const whereSql =
      whereConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
        : Prisma.empty;
    const sortDirectionSql =
      query.sortDirection === 'asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');

    const [countRows, rows] = await Promise.all([
      this.prisma.$queryRaw<AuditLogCountRow[]>(
        Prisma.sql`
          SELECT COUNT(*)::int AS total
          FROM admin_action_log a
          LEFT JOIN "user" actor ON actor.id = a.actor_user_id
          LEFT JOIN "user" target_user ON target_user.id = a.target_user_id
          ${whereSql}
        `,
      ),
      this.prisma.$queryRaw<AuditLogRawRow[]>(
        Prisma.sql`
          SELECT
            a.id,
            a.action,
            a.target_entity_type,
            a.target_entity_id,
            a.actor_user_id,
            actor.name AS actor_name,
            actor.email AS actor_email,
            a.context_id,
            c.name AS context_name,
            a.target_user_id,
            target_user.name AS target_user_name,
            target_user.email AS target_user_email,
            a.request_id,
            a.channel,
            a.ip_address,
            a.user_agent,
            a.metadata,
            a.occurred_at
          FROM admin_action_log a
          LEFT JOIN "user" actor ON actor.id = a.actor_user_id
          LEFT JOIN "user" target_user ON target_user.id = a.target_user_id
          LEFT JOIN context c ON c.id = a.context_id
          ${whereSql}
          ORDER BY a.occurred_at ${sortDirectionSql}
          LIMIT ${pageSize}
          OFFSET ${offset}
        `,
      ),
    ]);

    const totalItems = countRows[0]?.total ?? 0;
    const queryParams = this.buildAuditLogQueryParams(query, searchTerm);

    return {
      data: rows.map((row) => this.mapToResponse(row)),
      meta: createPaginationMeta({
        page,
        pageSize,
        totalItems,
        baseUrl: '/v1/audit-logs',
        queryParams,
      }),
      links: createPaginationLinks({
        page,
        pageSize,
        totalItems,
        baseUrl: '/v1/audit-logs',
        queryParams,
      }),
    };
  }

  private validateInput(input: AuditLogInput): void {
    if (!input.action) {
      throw new BadRequestException('AuditLog.action é obrigatório');
    }
    if (!input.targetEntityType) {
      throw new BadRequestException('AuditLog.targetEntityType é obrigatório');
    }
    if (input.targetEntityId === null || input.targetEntityId === undefined || input.targetEntityId === '') {
      throw new BadRequestException('AuditLog.targetEntityId é obrigatório');
    }
    if (input.actor?.userId === undefined) {
      throw new BadRequestException('AuditLog.actor.userId é obrigatório (pode ser null para sistema)');
    }
  }

  private buildAuditLogWhereSqlFragments(
    query: AuditLogQueryDto,
    searchTerm: string | undefined,
  ): Prisma.Sql[] {
    const whereConditions: Prisma.Sql[] = [];

    if (query.action) {
      whereConditions.push(Prisma.sql`a.action = ${query.action}`);
    }
    if (query.targetEntityType) {
      whereConditions.push(
        Prisma.sql`a.target_entity_type = ${query.targetEntityType}`,
      );
    }
    if (query.actorUserId != null) {
      whereConditions.push(Prisma.sql`a.actor_user_id = ${query.actorUserId}`);
    }
    if (query.contextId != null) {
      whereConditions.push(Prisma.sql`a.context_id = ${query.contextId}`);
    }
    if (query.dateFrom) {
      whereConditions.push(Prisma.sql`a.occurred_at >= ${new Date(query.dateFrom)}`);
    }
    if (query.dateTo) {
      whereConditions.push(Prisma.sql`a.occurred_at <= ${new Date(query.dateTo)}`);
    }
    if (searchTerm) {
      const like = `%${searchTerm}%`;
      whereConditions.push(
        Prisma.sql`(
          a.action ILIKE ${like}
          OR a.target_entity_type ILIKE ${like}
          OR a.target_entity_id ILIKE ${like}
          OR actor.name ILIKE ${like}
          OR actor.email ILIKE ${like}
          OR target_user.name ILIKE ${like}
          OR target_user.email ILIKE ${like}
        )`,
      );
    }

    return whereConditions;
  }

  private buildAuditLogQueryParams(
    query: AuditLogQueryDto,
    searchTerm: string | undefined,
  ): Record<string, unknown> {
    const queryParams: Record<string, unknown> = {};
    if (query.action) queryParams.action = query.action;
    if (query.targetEntityType) queryParams.targetEntityType = query.targetEntityType;
    if (query.actorUserId != null) queryParams.actorUserId = query.actorUserId;
    if (query.contextId != null) queryParams.contextId = query.contextId;
    if (query.dateFrom) queryParams.dateFrom = query.dateFrom;
    if (query.dateTo) queryParams.dateTo = query.dateTo;
    if (searchTerm) queryParams.search = searchTerm;
    if (query.sortDirection) queryParams.sortDirection = query.sortDirection;
    return queryParams;
  }

  private async insert(executor: PrismaRawExecutor, input: AuditLogInput): Promise<void> {
    this.validateInput(input);

    const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

    await executor.$executeRaw(
      Prisma.sql`
        INSERT INTO admin_action_log (
          action,
          target_entity_type,
          target_entity_id,
          actor_user_id,
          context_id,
          target_user_id,
          request_id,
          channel,
          ip_address,
          user_agent,
          metadata,
          occurred_at
        ) VALUES (
          ${input.action},
          ${input.targetEntityType},
          ${String(input.targetEntityId)},
          ${input.actor.userId},
          ${input.contextId ?? null},
          ${input.targetUserId ?? null},
          ${input.request?.requestId ?? null},
          ${input.request?.channel ?? null},
          ${input.request?.ipAddress ?? null},
          ${input.request?.userAgent ?? null},
          ${metadataJson}::jsonb,
          ${input.occurredAt ?? new Date()}
        )
      `,
    );
  }

  private mapToResponse(row: AuditLogRawRow): AuditLogResponseDto {
    return {
      id: row.id,
      action: row.action,
      targetEntityType: row.target_entity_type,
      targetEntityId: row.target_entity_id,
      actorUserId: row.actor_user_id,
      actorName: row.actor_name,
      actorEmail: row.actor_email,
      contextId: row.context_id,
      contextName: row.context_name,
      targetUserId: row.target_user_id,
      targetUserName: row.target_user_name,
      targetUserEmail: row.target_user_email,
      requestId: row.request_id,
      channel: row.channel,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata,
      occurredAt: row.occurred_at,
    };
  }
}
