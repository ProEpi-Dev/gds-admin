import { Controller, Get, Headers } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceStatusDto } from './dto/maintenance-status.dto';
import { Public } from '../common/decorators/public.decorator';
import { AllowDuringMaintenance } from '../common/decorators/allow-during-maintenance.decorator';

/**
 * Controller separado do CRUD de propósito: aquele é `@Roles('admin')` no nível
 * da classe, e um endpoint público ali dentro esbarraria no RolesGuard.
 *
 * Público porque o texto da janela é destinado ao usuário final, e precisa ser
 * legível por quem ainda nem autenticou. Liberado durante a manutenção porque é
 * exatamente aí que ele importa.
 */
@ApiTags('Maintenance')
@Controller('maintenance')
export class MaintenanceStatusController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Public()
  @AllowDuringMaintenance()
  @Get('current')
  @ApiOperation({
    summary: 'Janela de indisponibilidade em vigor',
    description:
      'Único jeito de o cliente descobrir uma janela `banner`, que por definição não faz nenhuma requisição falhar. Textos já resolvidos por Accept-Language, com fallback pt.',
  })
  @ApiResponse({ status: 200, type: MaintenanceStatusDto })
  async current(
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<MaintenanceStatusDto> {
    const window = await this.maintenance.getActiveWindow();

    if (!window) {
      return {
        inMaintenance: false,
        mode: null,
        title: null,
        message: null,
        startsAt: null,
        endsAt: null,
      };
    }

    return {
      inMaintenance: true,
      mode: window.mode,
      title: this.maintenance.resolveText(window.title, acceptLanguage),
      message: this.maintenance.resolveText(window.message, acceptLanguage),
      startsAt: window.startsAt.toISOString(),
      endsAt: window.endsAt ? window.endsAt.toISOString() : null,
    };
  }
}
