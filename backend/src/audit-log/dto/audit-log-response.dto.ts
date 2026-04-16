import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  action: string;

  @ApiProperty()
  targetEntityType: string;

  @ApiProperty()
  targetEntityId: string;

  @ApiPropertyOptional()
  actorUserId: number | null;

  @ApiPropertyOptional()
  actorName: string | null;

  @ApiPropertyOptional()
  actorEmail: string | null;

  @ApiPropertyOptional()
  contextId: number | null;

  @ApiPropertyOptional()
  contextName: string | null;

  @ApiPropertyOptional()
  targetUserId: number | null;

  @ApiPropertyOptional()
  targetUserName: string | null;

  @ApiPropertyOptional()
  targetUserEmail: string | null;

  @ApiPropertyOptional()
  requestId: string | null;

  @ApiPropertyOptional()
  channel: string | null;

  @ApiPropertyOptional()
  ipAddress: string | null;

  @ApiPropertyOptional()
  userAgent: string | null;

  @ApiPropertyOptional({ type: Object })
  metadata: Record<string, unknown> | null;

  @ApiProperty()
  occurredAt: Date;
}
