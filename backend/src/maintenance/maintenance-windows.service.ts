import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditLogService,
  AuditRequestContext,
} from '../audit-log/audit-log.service';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationLinks,
  createPaginationMeta,
} from '../common/helpers/pagination.helper';
import { MaintenanceService } from './maintenance.service';
import {
  CreateMaintenanceWindowDto,
  MaintenanceWindowQueryDto,
  MaintenanceWindowResponseDto,
  UpdateMaintenanceWindowDto,
} from './dto/maintenance-window.dto';

const BASE_URL = '/maintenance-windows';

type WindowRow = {
  id: number;
  mode: string;
  starts_at: Date;
  ends_at: Date | null;
  title: unknown;
  message: unknown;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class MaintenanceWindowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly maintenance: MaintenanceService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(
    query: MaintenanceWindowQueryDto,
  ): Promise<ListResponseDto<MaintenanceWindowResponseDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = MaintenanceWindowsService.buildWhere(query);

    const [rows, totalItems] = await Promise.all([
      this.prisma.maintenance_window.findMany({
        where,
        orderBy: [{ starts_at: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.maintenance_window.count({ where }),
    ]);

    const options = { page, pageSize, totalItems, baseUrl: BASE_URL };
    return {
      data: (rows as WindowRow[]).map(MaintenanceWindowsService.toResponse),
      meta: createPaginationMeta(options),
      links: createPaginationLinks(options),
    };
  }

  async findOne(id: number): Promise<MaintenanceWindowResponseDto> {
    const row = await this.prisma.maintenance_window.findUnique({
      where: { id },
    });

    if (!row) {
      throw new NotFoundException(`Janela ${id} não encontrada`);
    }
    return MaintenanceWindowsService.toResponse(row as WindowRow);
  }

  async create(
    dto: CreateMaintenanceWindowDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<MaintenanceWindowResponseDto> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    MaintenanceWindowsService.assertPeriod(startsAt, endsAt);

    const row = await this.prisma.maintenance_window.create({
      data: {
        mode: dto.mode,
        starts_at: startsAt,
        ends_at: endsAt,
        title: { ...dto.title },
        message: { ...dto.message },
        active: dto.active ?? true,
      },
    });

    this.maintenance.invalidateCache();
    await this.recordAudit('MAINTENANCE_WINDOW_CREATE', row as WindowRow, {
      actorUserId,
      auditRequest,
    });

    return MaintenanceWindowsService.toResponse(row as WindowRow);
  }

  async update(
    id: number,
    dto: UpdateMaintenanceWindowDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<MaintenanceWindowResponseDto> {
    const current = (await this.prisma.maintenance_window.findUnique({
      where: { id },
    })) as WindowRow | null;

    if (!current) {
      throw new NotFoundException(`Janela ${id} não encontrada`);
    }

    const data = MaintenanceWindowsService.buildUpdateData(dto);
    MaintenanceWindowsService.assertPeriod(
      (data.starts_at as Date) ?? current.starts_at,
      data.ends_at === undefined
        ? current.ends_at
        : (data.ends_at as Date | null),
    );

    const row = await this.prisma.maintenance_window.update({
      where: { id },
      data,
    });

    this.maintenance.invalidateCache();
    await this.recordAudit('MAINTENANCE_WINDOW_UPDATE', row as WindowRow, {
      actorUserId,
      auditRequest,
      extra: { changedFields: Object.keys(data) },
    });

    return MaintenanceWindowsService.toResponse(row as WindowRow);
  }

  /**
   * Remoção é física: a janela é operacional e de vida curta, e um `active`
   * falso já cobre o caso de "cadastrei e desisti" sem perder o rastro, que
   * fica no admin_action_log.
   */
  async remove(
    id: number,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<void> {
    const row = (await this.prisma.maintenance_window.findUnique({
      where: { id },
    })) as WindowRow | null;

    if (!row) {
      throw new NotFoundException(`Janela ${id} não encontrada`);
    }

    await this.prisma.maintenance_window.delete({ where: { id } });
    this.maintenance.invalidateCache();
    await this.recordAudit('MAINTENANCE_WINDOW_DELETE', row, {
      actorUserId,
      auditRequest,
    });
  }

  private async recordAudit(
    action:
      | 'MAINTENANCE_WINDOW_CREATE'
      | 'MAINTENANCE_WINDOW_UPDATE'
      | 'MAINTENANCE_WINDOW_DELETE',
    row: WindowRow,
    options: {
      actorUserId: number;
      auditRequest?: AuditRequestContext;
      extra?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.auditLogService.record({
      action,
      targetEntityType: 'maintenance_window',
      targetEntityId: row.id,
      actor: { userId: options.actorUserId },
      request: options.auditRequest ?? null,
      metadata: {
        mode: row.mode,
        startsAt: row.starts_at.toISOString(),
        endsAt: row.ends_at ? row.ends_at.toISOString() : null,
        active: row.active,
        ...options.extra,
      },
    });
  }

  private static buildWhere(query: MaintenanceWindowQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.active !== undefined) {
      where.active = query.active;
    }
    if (query.mode !== undefined) {
      where.mode = query.mode;
    }
    return where;
  }

  private static buildUpdateData(
    dto: UpdateMaintenanceWindowDto,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (dto.mode !== undefined) data.mode = dto.mode;
    if (dto.startsAt !== undefined) data.starts_at = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) {
      data.ends_at = dto.endsAt ? new Date(dto.endsAt) : null;
    }
    if (dto.title !== undefined) data.title = { ...dto.title };
    if (dto.message !== undefined) data.message = { ...dto.message };
    if (dto.active !== undefined) data.active = dto.active;

    return data;
  }

  /** Espelha ck_maintenance_window_period: janela invertida nunca terminaria. */
  private static assertPeriod(startsAt: Date, endsAt: Date | null): void {
    if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException('endsAt deve ser posterior a startsAt');
    }
  }

  private static toResponse(row: WindowRow): MaintenanceWindowResponseDto {
    const now = Date.now();
    const started = row.starts_at.getTime() <= now;
    const notFinished = !row.ends_at || row.ends_at.getTime() > now;

    return {
      id: row.id,
      mode: row.mode as MaintenanceWindowResponseDto['mode'],
      startsAt: row.starts_at.toISOString(),
      endsAt: row.ends_at ? row.ends_at.toISOString() : null,
      title: row.title as MaintenanceWindowResponseDto['title'],
      message: row.message as MaintenanceWindowResponseDto['message'],
      active: row.active,
      inEffect: row.active && started && notFinished,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
