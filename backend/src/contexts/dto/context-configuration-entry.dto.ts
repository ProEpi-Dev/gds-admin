import { ApiProperty } from '@nestjs/swagger';

export class ContextConfigurationEntryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'negative_report_dedup_window_min' })
  key: string;

  @ApiProperty({ example: 60, description: 'Valor JSON persistido' })
  value: unknown;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
