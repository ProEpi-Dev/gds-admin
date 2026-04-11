import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class SectionScheduleItemDto {
  @ApiProperty({ description: 'ID da seção (da trilha do ciclo)' })
  @IsInt()
  @Min(1)
  sectionId: number;

  @ApiPropertyOptional({
    description: 'Início opcional (YYYY-MM-DD); omita ou null para herdar o ciclo',
    example: '2026-04-06',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({
    description: 'Término opcional (YYYY-MM-DD); omita ou null para herdar o ciclo',
    example: '2026-04-12',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;
}

export class SequenceScheduleItemDto {
  @ApiProperty({ description: 'ID da sequência (conteúdo/quiz na trilha)' })
  @IsInt()
  @Min(1)
  sequenceId: number;

  @ApiPropertyOptional({ example: '2026-04-07' })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({ example: '2026-04-10' })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;
}

export class ReplaceTrackCycleSchedulesDto {
  @ApiProperty({
    type: [SectionScheduleItemDto],
    description:
      'Substitui todos os agendamentos de seção do ciclo (omitir array vazio para limpar). ' +
      'O corpo pode usar section_schedules / section_id / start_date / end_date (snake_case); ver documentação do endpoint.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionScheduleItemDto)
  sectionSchedules: SectionScheduleItemDto[];

  @ApiProperty({
    type: [SequenceScheduleItemDto],
    description:
      'Substitui todos os agendamentos de sequência do ciclo. ' +
      'Aceita também sequence_schedules / sequence_id (snake_case).',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SequenceScheduleItemDto)
  sequenceSchedules: SequenceScheduleItemDto[];
}
