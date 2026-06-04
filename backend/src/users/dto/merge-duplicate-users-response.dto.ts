import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class MergeDuplicateUserCandidateDto {
  @ApiProperty({ example: 42570 })
  id: number;

  @ApiProperty({ example: 'joao@example.com' })
  email: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class MergeParticipationStatDto {
  @ApiProperty({ example: 42570 })
  userId: number;

  @ApiProperty({ example: 42573 })
  participationId: number;

  @ApiProperty({
    example: 1,
    description:
      'Sempre 1 por linha: indica uma participação distinta do usuário (use reportsByParticipation para volumes de reports).',
  })
  count: number;
}

export class MergeParticipationAggregateStatDto {
  @ApiProperty({ example: 42573 })
  participationId: number;

  @ApiProperty({ example: 12 })
  count: number;
}

export class MergeDuplicateUsersStatsDto {
  @ApiProperty({ type: [MergeParticipationStatDto] })
  participationsByUser: MergeParticipationStatDto[];

  @ApiProperty({ type: [MergeParticipationAggregateStatDto] })
  reportsByParticipation: MergeParticipationAggregateStatDto[];

  @ApiProperty({ type: [MergeParticipationAggregateStatDto] })
  quizSubmissionsByParticipation: MergeParticipationAggregateStatDto[];
}

export class MergeDuplicateUsersLogEntryDto {
  @ApiProperty({ example: 'start' })
  action: string;

  @ApiProperty({ example: 'canonical=42570 duplicates={1182}' })
  detail: string;
}

export class MergeDuplicateUsersResponseDto {
  @ApiProperty({ example: false })
  dryRun: boolean;

  @ApiProperty({ type: [MergeDuplicateUserCandidateDto] })
  users: MergeDuplicateUserCandidateDto[];

  @ApiProperty({ type: MergeDuplicateUsersStatsDto })
  preMergeStats: MergeDuplicateUsersStatsDto;

  @ApiPropertyOptional({ type: MergeDuplicateUsersStatsDto })
  postMergeStats?: MergeDuplicateUsersStatsDto;

  @ApiPropertyOptional({ type: [MergeDuplicateUsersLogEntryDto] })
  mergeLog?: MergeDuplicateUsersLogEntryDto[];

  @ApiPropertyOptional({ type: UserResponseDto })
  canonicalUser?: UserResponseDto;
}
