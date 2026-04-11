import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import type { SectionScheduleItemDto } from '../dto/replace-track-cycle-schedules.dto';
import type { SequenceScheduleItemDto } from '../dto/replace-track-cycle-schedules.dto';

function normalizeDateField(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v === 'string') return v;
  throw new BadRequestException('Datas de agendamento devem ser strings (YYYY-MM-DD) ou null');
}

function asObject(row: unknown, label: string): Record<string, unknown> {
  if (row == null || typeof row !== 'object' || Array.isArray(row)) {
    throw new BadRequestException(`${label}: cada item deve ser um objeto`);
  }
  return row as Record<string, unknown>;
}

/**
 * Normaliza o corpo de PUT .../schedules antes do ValidationPipe global
 * (whitelist + forbidNonWhitelisted). Aceita camelCase ou snake_case no raiz
 * e nos itens, espelhando GET/Prisma sem quebrar clientes que já usam camelCase.
 */
@Injectable()
export class NormalizeReplaceTrackCycleSchedulesPipe implements PipeTransform<
  Record<string, unknown>,
  { sectionSchedules: SectionScheduleItemDto[]; sequenceSchedules: SequenceScheduleItemDto[] }
> {
  transform(body: Record<string, unknown>): {
    sectionSchedules: SectionScheduleItemDto[];
    sequenceSchedules: SequenceScheduleItemDto[];
  } {
    const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

    const sectionSource = b.sectionSchedules ?? b.section_schedules;
    const sequenceSource = b.sequenceSchedules ?? b.sequence_schedules;

    const sectionSchedules = Array.isArray(sectionSource)
      ? sectionSource.map((row, i) => this.normalizeSectionRow(row, i))
      : [];

    const sequenceSchedules = Array.isArray(sequenceSource)
      ? sequenceSource.map((row, i) => this.normalizeSequenceRow(row, i))
      : [];

    return { sectionSchedules, sequenceSchedules };
  }

  private normalizeSectionRow(row: unknown, index: number): SectionScheduleItemDto {
    const r = asObject(row, `sectionSchedules[${index}]`);
    const idRaw = r.sectionId ?? r.section_id;
    if (idRaw === undefined || idRaw === null) {
      throw new BadRequestException(
        `sectionSchedules[${index}]: sectionId (ou section_id) é obrigatório`,
      );
    }
    const sectionId = typeof idRaw === 'number' ? idRaw : Number(idRaw);
    if (!Number.isInteger(sectionId) || sectionId < 1) {
      throw new BadRequestException(
        `sectionSchedules[${index}]: sectionId deve ser um inteiro ≥ 1`,
      );
    }
    return {
      sectionId,
      startDate: normalizeDateField(r.startDate ?? r.start_date),
      endDate: normalizeDateField(r.endDate ?? r.end_date),
    };
  }

  private normalizeSequenceRow(row: unknown, index: number): SequenceScheduleItemDto {
    const r = asObject(row, `sequenceSchedules[${index}]`);
    const idRaw = r.sequenceId ?? r.sequence_id;
    if (idRaw === undefined || idRaw === null) {
      throw new BadRequestException(
        `sequenceSchedules[${index}]: sequenceId (ou sequence_id) é obrigatório`,
      );
    }
    const sequenceId = typeof idRaw === 'number' ? idRaw : Number(idRaw);
    if (!Number.isInteger(sequenceId) || sequenceId < 1) {
      throw new BadRequestException(
        `sequenceSchedules[${index}]: sequenceId deve ser um inteiro ≥ 1`,
      );
    }
    return {
      sequenceId,
      startDate: normalizeDateField(r.startDate ?? r.start_date),
      endDate: normalizeDateField(r.endDate ?? r.end_date),
    };
  }
}
