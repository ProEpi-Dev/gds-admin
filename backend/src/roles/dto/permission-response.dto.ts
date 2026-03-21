import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'content:write' })
  code: string;

  @ApiProperty({ example: 'Gerenciar conteúdos' })
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  active: boolean;
}
