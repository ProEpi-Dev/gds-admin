import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class UpsertContextConfigurationDto {
  @ApiProperty({
    description: 'Valor JSON (número, boolean, string, objeto ou array)',
    example: 60,
  })
  @IsDefined({ message: 'value é obrigatório' })
  value: unknown;
}
