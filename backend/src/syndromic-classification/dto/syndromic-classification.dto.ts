import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateSymptomDto {
  @ApiProperty({ example: 'febre' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Febre' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Temperatura corporal elevada.' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSymptomDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class CreateSyndromeDto {
  @ApiProperty({ example: 'gripal' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Síndrome Gripal' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 0.36 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  @IsOptional()
  thresholdScore?: number;
}

export class UpdateSyndromeDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 0.41 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  @IsOptional()
  thresholdScore?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class CreateSyndromeWeightDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  syndromeId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  symptomId: number;

  @ApiProperty({ example: 0.192 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  weight: number;
}

export class UpdateSyndromeWeightDto {
  @ApiPropertyOptional({ example: 0.203 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class SyndromeWeightMatrixCellDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  syndromeId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  symptomId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  weight: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpsertSyndromeWeightMatrixDto {
  @ApiProperty({ type: [SyndromeWeightMatrixCellDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => SyndromeWeightMatrixCellDto)
  cells: SyndromeWeightMatrixCellDto[];
}

export class CreateSyndromeFormConfigDto {
  @ApiProperty({ description: 'ID do formulário (form); vale para todas as versões desse form.' })
  @Type(() => Number)
  @IsInt()
  formId: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  symptomsFieldName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  symptomsFieldId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  symptomOnsetDateFieldName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  symptomOnsetDateFieldId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateSyndromeFormConfigDto {
  @ApiPropertyOptional({ description: 'Trocar o formulário associado (raro).' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  formId?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  symptomsFieldName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  symptomsFieldId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  symptomOnsetDateFieldName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  symptomOnsetDateFieldId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class CreateFormSymptomMappingDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  syndromeFormConfigId: number;

  @ApiProperty()
  @IsString()
  formOptionValue: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  formOptionLabel?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  symptomId: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateFormSymptomMappingDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  syndromeFormConfigId?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  formOptionValue?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  formOptionLabel?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  symptomId?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class ReprocessSyndromicClassificationDto {
  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @IsOptional()
  reportIds?: number[];

  @ApiPropertyOptional({
    description: 'Filtra reports cuja versão pertence a este formulário (form_id).',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  formId?: number;

  @ApiPropertyOptional({
    deprecated: true,
    description: 'Preferir `formId`. Se informado, filtra pela versão indicada.',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  formVersionId?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description:
      'Restringe a reports cuja participação pertence a este contexto. Recomendado em reprocessamento por período.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  contextId?: number;

  @ApiPropertyOptional({ default: true })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  onlyLatestActive?: boolean = true;

  @ApiPropertyOptional({ default: 100, maximum: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  limit?: number = 100;

  @ApiPropertyOptional({ description: 'Cursor baseado em report_id.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  cursor?: number;
}

export class DailySyndromeCountsQueryDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  contextId?: number;

  @ApiPropertyOptional({ description: 'Lista de IDs de síndrome (csv ou repetição de query param).' })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value.map(Number);
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item));
    }
    return value;
  })
  @IsInt({ each: true })
  @IsOptional()
  syndromeIds?: number[];

  @ApiPropertyOptional({ default: true })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  onlyAboveThreshold?: boolean = true;
}

export class ReportSyndromeScoreResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  reportId: number;

  @ApiPropertyOptional({
    description: 'Localização do report no formato { latitude, longitude }',
  })
  occurrenceLocation:
    | { latitude: number; longitude: number }
    | null;

  @ApiPropertyOptional()
  syndromeId: number | null;

  @ApiPropertyOptional()
  syndromeCode: string | null;

  @ApiPropertyOptional()
  syndromeName: string | null;

  @ApiPropertyOptional()
  score: number | null;

  @ApiPropertyOptional()
  thresholdScore: number | null;

  @ApiPropertyOptional()
  isAboveThreshold: boolean | null;

  @ApiProperty()
  processingStatus: string;

  @ApiPropertyOptional()
  processingError: string | null;

  @ApiProperty()
  processedAt: Date;
}

export class ReportSyndromeScoresQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  contextId?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  reportId?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  syndromeId?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ['processed', 'skipped', 'failed'],
  })
  @IsIn(['processed', 'skipped', 'failed'])
  @IsOptional()
  processingStatus?: 'processed' | 'skipped' | 'failed';

  @ApiPropertyOptional({
    description: 'Filtra por is_above_threshold (true = acima do limiar)',
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isAboveThreshold?: boolean;

  @ApiPropertyOptional({ default: true })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  onlyLatest?: boolean = true;
}
