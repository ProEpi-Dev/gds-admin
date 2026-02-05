import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { track_cycle_status_enum } from '@prisma/client';

/** Slug: apenas letras minúsculas, números e hífens (ex.: formacao-inicial) */
const MANDATORY_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateTrackCycleDto {
  @ApiProperty({
    description: 'ID da trilha (track)',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  trackId: number;

  @ApiProperty({
    description: 'ID do contexto onde o ciclo será oferecido',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  contextId: number;

  @ApiProperty({
    description: 'Nome/código do ciclo',
    example: '2026.1',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Descrição adicional do ciclo',
    example: 'Primeiro semestre de 2026',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description:
      'Slug único que marca o ciclo como trilha obrigatória. Apenas um ciclo no sistema pode ter cada valor; deixe em branco se não for obrigatório. Ex.: formacao-inicial, boas-vidas',
    example: 'formacao-inicial',
    maxLength: 80,
    required: false,
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @ValidateIf((o) => o.mandatorySlug != null && o.mandatorySlug !== '')
  @IsString()
  @MaxLength(80)
  @Matches(MANDATORY_SLUG_REGEX, {
    message:
      'mandatorySlug deve conter apenas letras minúsculas, números e hífens (ex.: formacao-inicial)',
  })
  mandatorySlug?: string;

  @ApiProperty({
    description: 'Status do ciclo',
    enum: track_cycle_status_enum,
    example: track_cycle_status_enum.draft,
    default: track_cycle_status_enum.draft,
  })
  @IsEnum(track_cycle_status_enum)
  @IsOptional()
  status?: track_cycle_status_enum;

  @ApiProperty({
    description: 'Data de início do ciclo',
    example: '2026-02-01',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'Data de término do ciclo',
    example: '2026-06-30',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
