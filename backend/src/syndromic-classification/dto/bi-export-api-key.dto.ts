import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class ListBiExportApiKeysQueryDto {
  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contextId: number;
}

export class CreateBiExportApiKeyDto {
  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contextId: number;

  @ApiProperty({ example: 'Dashboard semanal — export sindrômico', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  name: string;
}

export class BiExportApiKeyListItemDto {
  @ApiProperty()
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  contextId: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  revokedAt: Date | null;

  @ApiPropertyOptional()
  lastUsedAt: Date | null;
}

export class CreateBiExportApiKeyResponseDto {
  @ApiProperty({
    description:
      'Chave completa no formato `publicId.secret` — copie agora; o segredo não será exibido de novo.',
  })
  apiKey: string;

  @ApiProperty()
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  contextId: number;

  @ApiProperty()
  createdAt: Date;
}
