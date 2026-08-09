import { ApiProperty } from '@nestjs/swagger';
import {
  MAINTENANCE_MODES,
  type MaintenanceModeDto,
} from './maintenance-window.dto';

export class MaintenanceStatusDto {
  @ApiProperty({
    description: 'true quando há janela habilitada e vigente neste instante',
    example: true,
  })
  inMaintenance: boolean;

  @ApiProperty({
    description: 'Grau da janela em vigor. Nulo fora de janela.',
    enum: MAINTENANCE_MODES,
    nullable: true,
    example: 'full',
  })
  mode: MaintenanceModeDto | null;

  @ApiProperty({
    description:
      'Título já resolvido pelo Accept-Language. Nulo fora de janela.',
    nullable: true,
    example: 'Manutenção programada',
  })
  title: string | null;

  @ApiProperty({
    description:
      'Mensagem já resolvida pelo Accept-Language. Nulo fora de janela.',
    nullable: true,
    example: 'Voltamos às 6h.',
  })
  message: string | null;

  @ApiProperty({ nullable: true, example: '2026-08-10T02:00:00.000Z' })
  startsAt: string | null;

  @ApiProperty({
    description: 'Nulo quando não há previsão de retorno.',
    nullable: true,
    example: '2026-08-10T06:00:00.000Z',
  })
  endsAt: string | null;
}
