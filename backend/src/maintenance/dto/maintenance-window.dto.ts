import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export const MAINTENANCE_MODES = ['banner', 'read_only', 'full'] as const;
export type MaintenanceModeDto = (typeof MAINTENANCE_MODES)[number];

/**
 * `pt` é obrigatório porque é o fallback da resolução por Accept-Language — o
 * banco também exige (ck_maintenance_window_title_pt), e validar aqui devolve
 * 400 em vez de deixar estourar como erro do Prisma.
 */
export class LocalizedTextDto {
  @ApiProperty({
    description: 'Texto em português',
    example: 'Manutenção programada',
  })
  @IsString()
  @MinLength(1)
  pt: string;

  @ApiPropertyOptional({ description: 'Texto em inglês' })
  @IsString()
  @IsOptional()
  en?: string;

  @ApiPropertyOptional({ description: 'Texto em espanhol' })
  @IsString()
  @IsOptional()
  es?: string;
}

export class CreateMaintenanceWindowDto {
  @ApiProperty({
    description:
      'banner apenas avisa; read_only bloqueia mutações; full bloqueia tudo',
    enum: MAINTENANCE_MODES,
    example: 'full',
  })
  @IsEnum(MAINTENANCE_MODES)
  mode: MaintenanceModeDto;

  @ApiProperty({
    description: 'Início da janela (UTC, ISO 8601)',
    example: '2026-08-10T02:00:00.000Z',
  })
  @IsISO8601()
  startsAt: string;

  @ApiPropertyOptional({
    description:
      'Fim previsto (UTC, ISO 8601). Omitir para indisponibilidade sem previsão de retorno.',
    example: '2026-08-10T06:00:00.000Z',
    nullable: true,
  })
  @IsISO8601()
  @IsOptional()
  endsAt?: string | null;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  message: LocalizedTextDto;

  @ApiPropertyOptional({
    description: 'Permite cadastrar a janela desativada e habilitar depois',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateMaintenanceWindowDto extends PartialType(
  CreateMaintenanceWindowDto,
) {}

export class MaintenanceWindowQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por situação de habilitação' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Filtra por grau da janela',
    enum: MAINTENANCE_MODES,
  })
  @IsEnum(MAINTENANCE_MODES)
  @IsOptional()
  mode?: MaintenanceModeDto;
}

export class MaintenanceWindowResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: MAINTENANCE_MODES, example: 'full' })
  mode: MaintenanceModeDto;

  @ApiProperty({ example: '2026-08-10T02:00:00.000Z' })
  startsAt: string;

  @ApiProperty({ example: '2026-08-10T06:00:00.000Z', nullable: true })
  endsAt: string | null;

  @ApiProperty({ type: LocalizedTextDto })
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  message: LocalizedTextDto;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({
    description:
      'true quando a janela está habilitada e o instante atual está dentro do período — é esta que o guard aplica',
    example: false,
  })
  inEffect: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
