import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { SignupResponseDto } from './dto/signup-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { RefreshTokenBodyDto } from './dto/refresh-token.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Request } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<LoginResponseDto> {
    const clientIp =
      (req as any).ip ??
      req.socket?.remoteAddress ??
      req.headers?.['x-forwarded-for']?.toString() ??
      undefined;
    return this.authService.login(loginDto, clientIp);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar access token',
    description:
      'Envia o refresh token para obter um novo JWT e um novo refresh token (rotação).',
  })
  @ApiBody({ type: RefreshTokenBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Novos tokens emitidos',
    type: RefreshResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado' })
  async refresh(
    @Body() body: RefreshTokenBodyDto,
  ): Promise<RefreshResponseDto> {
    return this.authService.refreshAccessToken(body.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Encerrar sessão (refresh)',
    description: 'Revoga o refresh token informado. O JWT de acesso continua válido até expirar.',
  })
  @ApiBody({ type: RefreshTokenBodyDto })
  @ApiResponse({ status: 204, description: 'Refresh token revogado' })
  async logout(@Body() body: RefreshTokenBodyDto): Promise<void> {
    await this.authService.logoutWithRefreshToken(body.refreshToken);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Alterar senha do usuário logado',
    description: 'Permite que o usuário autenticado altere sua própria senha',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 204,
    description: 'Senha alterada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou nova senha igual à atual',
  })
  @ApiResponse({
    status: 401,
    description: 'Senha atual incorreta ou usuário não autenticado',
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.authService.changePassword(user.userId, changePasswordDto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar redefinição de senha',
    description:
      'Envia um email com link para redefinir a senha. Sempre retorna sucesso para não revelar se o email existe.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Se o email estiver cadastrado, as instruções serão enviadas',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.requestPasswordReset(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Redefinir senha com token',
    description: 'Redefine a senha usando o token recebido por email.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 204,
    description: 'Senha redefinida com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido ou expirado',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar nova conta de usuário',
    description:
      'Cria um novo usuário com aceite de termos legais e auto-login. Endpoint público.',
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso',
    type: SignupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou documentos legais não aceitos',
  })
  @ApiResponse({
    status: 403,
    description: 'Contexto não é público',
  })
  @ApiResponse({
    status: 409,
    description: 'Email já está em uso',
  })
  async signup(
    @Body() signupDto: SignupDto,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ): Promise<SignupResponseDto> {
    const ipAddress =
      request.ip ||
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.socket.remoteAddress;

    return this.authService.signup(signupDto, ipAddress, userAgent);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar email com token recebido por email' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email confirmado' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('request-email-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar reenvio do email de confirmação',
    description:
      'Resposta genérica por segurança. Só envia email se existir conta pendente num contexto que exige verificação.',
  })
  @ApiBody({ type: RequestEmailVerificationDto })
  @ApiResponse({ status: 200 })
  async requestEmailVerification(
    @Body() dto: RequestEmailVerificationDto,
  ): Promise<{ message: string }> {
    return this.authService.requestEmailVerificationPublic(dto.email);
  }
}
