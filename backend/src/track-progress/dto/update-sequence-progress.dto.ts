import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, IsDate } from 'class-validator';
import { progress_status_enum } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateSequenceProgressDto {
  @ApiProperty({
    description: 'Status da sequência',
    enum: progress_status_enum,
    example: progress_status_enum.in_progress,
    required: false,
  })
  @IsEnum(progress_status_enum)
  @IsOptional()
  status?: progress_status_enum;

  @ApiProperty({
    description: 'Tempo gasto na sequência em segundos',
    example: 120,
    required: false,
  })
  @IsInt()
  @IsOptional()
  timeSpentSeconds?: number;

  @ApiProperty({
    description: 'Quantidade de visitas na sequência',
    example: 3,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  visits_count?: number;

  @ApiProperty({
    description: 'Data de conclusão da sequência',
    example: '2024-01-01T10:00:00Z',
    required: false,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  completed_at?: Date;

  @ApiProperty({
    description: 'Data de início da sequência',
    example: '2024-01-01T09:00:00Z',
    required: false,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  started_at?: Date;
}
