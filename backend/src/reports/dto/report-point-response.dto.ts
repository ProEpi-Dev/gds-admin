import { ApiProperty } from '@nestjs/swagger';
import { report_type_enum } from '@prisma/client';

export class ReportPointResponseDto {
  @ApiProperty({
    description: 'Latitude do ponto',
    example: -23.5505,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude do ponto',
    example: -46.6333,
  })
  longitude: number;

  @ApiProperty({
    description: 'Tipo do report (POSITIVE ou NEGATIVE)',
    enum: report_type_enum,
    example: 'POSITIVE',
  })
  reportType: report_type_enum;
}

