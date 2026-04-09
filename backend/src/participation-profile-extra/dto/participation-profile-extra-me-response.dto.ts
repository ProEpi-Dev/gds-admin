import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormVersionResponseDto } from '../../form-versions/dto/form-version-response.dto';
import { form_type_enum } from '@prisma/client';

export class ProfileExtraFormWithVersionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  reference: string | null;

  @ApiProperty({ enum: form_type_enum })
  type: form_type_enum;

  @ApiProperty({ type: FormVersionResponseDto })
  version: FormVersionResponseDto;
}

export class ProfileExtraSubmissionDto {
  @ApiProperty()
  formVersionId: number;

  @ApiProperty()
  response: Record<string, unknown>;

  @ApiProperty()
  updatedAt: Date;
}

export class ParticipationProfileExtraMeResponseDto {
  @ApiPropertyOptional({
    type: ProfileExtraFormWithVersionDto,
    nullable: true,
    description:
      'Formulário profile_extra do contexto da participação ativa (um por contexto; usa o de menor id se houver vários)',
  })
  form: ProfileExtraFormWithVersionDto | null;

  @ApiPropertyOptional({
    type: ProfileExtraSubmissionDto,
    nullable: true,
  })
  submission: ProfileExtraSubmissionDto | null;
}
