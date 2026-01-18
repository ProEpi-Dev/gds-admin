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
import { SignupDto } from './dto/signup.dto';
import { SignupResponseDto } from './dto/signup-response.dto';
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
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
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
}

