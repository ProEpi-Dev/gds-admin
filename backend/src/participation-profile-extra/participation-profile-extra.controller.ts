import { Body, Controller, Get, HttpCode, HttpStatus, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParticipationProfileExtraService } from './participation-profile-extra.service';
import { SaveParticipationProfileExtraDto } from './dto/save-participation-profile-extra.dto';
import {
  ParticipationProfileExtraMeResponseDto,
  ProfileExtraSubmissionDto,
} from './dto/participation-profile-extra-me-response.dto';

@ApiTags('Participation profile extra')
@ApiBearerAuth('bearerAuth')
@Controller('participation-profile-extra')
export class ParticipationProfileExtraController {
  constructor(
    private readonly participationProfileExtraService: ParticipationProfileExtraService,
  ) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dados adicionais de perfil (me)',
    description:
      'Retorna o formulário profile_extra do contexto da participação ativa e a submissão existente, se houver.',
  })
  @ApiResponse({ status: 200, type: ParticipationProfileExtraMeResponseDto })
  async getMe(
    @CurrentUser() user: { userId: number },
  ): Promise<ParticipationProfileExtraMeResponseDto> {
    return this.participationProfileExtraService.getMe(user.userId);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Salvar dados adicionais de perfil (me)' })
  @ApiResponse({ status: 200, type: ProfileExtraSubmissionDto })
  async saveMe(
    @CurrentUser() user: { userId: number },
    @Body() body: SaveParticipationProfileExtraDto,
  ): Promise<ProfileExtraSubmissionDto> {
    return this.participationProfileExtraService.saveMe(user.userId, body);
  }
}
