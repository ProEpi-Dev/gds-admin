import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateParticipationDto {
  @ApiProperty({
    description: 'ID do usuário',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: 'ID do contexto',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  contextId: number;

  @ApiProperty({
    description: 'Data de início da participação',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: 'Data de término da participação',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

