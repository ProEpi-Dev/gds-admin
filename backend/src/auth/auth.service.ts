import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DefaultFormDto } from './dto/default-form.dto';
import { SignupDto } from './dto/signup.dto';
import { SignupResponseDto } from './dto/signup-response.dto';
import { LegalDocumentsService } from '../legal-documents/legal-documents.service';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { BCRYPT_ROUNDS } from './constants/password.constants';
import { BusinessMetricsService } from '../telemetry/business-metrics.service';

@Injectable()
export class AuthService {
  private readonly resetTokenExpiryHours = 1;

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Parse duração estilo JWT (ex.: 7d, 12h, 30m). */
  private parseDurationToMilliseconds(value: string): number {
    const trimmed = value.trim().toLowerCase();
    const match = /^(\d+)(ms|s|m|h|d)$/.exec(trimmed);
    if (!match) {
      throw new Error(`Invalid JWT_REFRESH_EXPIRES_IN: ${value}`);
    }
    const n = Number.parseInt(match[1], 10);
    const mult: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return n * mult[match[2]];
  }

  private computeRefreshExpiryDate(): Date {
    const raw =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const ms = this.parseDurationToMilliseconds(raw);
    return new Date(Date.now() + ms);
  }

  private async issueRefreshToken(userId: number): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    const tokenHash = this.hashRefreshToken(raw);
    const expiresAt = this.computeRefreshExpiryDate();
    await this.prisma.user_refresh_token.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });
    return raw;
  }

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private legalDocumentsService: LegalDocumentsService,
    private mailService: MailService,
    private configService: ConfigService,
    private readonly businessMetrics: BusinessMetricsService,
    @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
  ) {}

  async login(
    loginDto: LoginDto,
    clientIp?: string,
  ): Promise<LoginResponseDto> {
    let user: Awaited<ReturnType<AuthService['validateUser']>>;
    try {
      user = await this.validateUser(loginDto.email, loginDto.password);
    } catch (err) {
      this.businessMetrics.recordAuthLogin('failure');
      throw err;
    }

    if (!user) {
      this.logger.warn(
        { event: 'LOGIN_FAILED', email: loginDto.email, ip: clientIp ?? 'n/a' },
        'Credenciais inválidas',
      );
      this.businessMetrics.recordAuthLogin('failure');
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);

    // Buscar participação ativa do usuário
    // Uma participação está ativa se:
    // - active = true
    // - start_date <= hoje
    // - end_date é null OU end_date >= hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    // Buscar todas as participações ativas do usuário e filtrar por data
    // Incluir o contexto relacionado para retornar id e name
    const participations = await this.prisma.participation.findMany({
      where: {
        user_id: user.id,
        active: true,
      },
      include: {
        context: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Filtrar em JavaScript para validar as datas (evita problemas de timezone)
    const activeParticipation = participations.find((participation) => {
      const startDate = new Date(participation.start_date);
      startDate.setHours(0, 0, 0, 0);
      startDate.setMinutes(0);
      startDate.setSeconds(0);
      startDate.setMilliseconds(0);

      // Verificar se start_date <= hoje
      if (startDate > today) {
        return false;
      }

      // Se end_date é null, a participação está ativa
      if (!participation.end_date) {
        return true;
      }

      // Se end_date existe, verificar se é >= hoje
      const endDate = new Date(participation.end_date);
      endDate.setHours(0, 0, 0, 0);
      endDate.setMinutes(0);
      endDate.setSeconds(0);
      endDate.setMilliseconds(0);

      return endDate >= today;
    });

    // Buscar formulários padrão
    const defaultForms = await this.getDefaultForms();

    this.businessMetrics.recordAuthLogin('success');
    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      participation: activeParticipation
        ? {
            id: activeParticipation.id,
            userId: activeParticipation.user_id,
            context: {
              id: activeParticipation.context.id,
              name: activeParticipation.context.name,
            },
            startDate: activeParticipation.start_date,
            endDate: activeParticipation.end_date,
            active: activeParticipation.active,
            createdAt: activeParticipation.created_at,
            updatedAt: activeParticipation.updated_at,
          }
        : null,
      defaultForms,
    };
  }

  private async getDefaultForms(): Promise<DefaultFormDto[]> {
    const defaultReferences = ['DEFAULT_SIGNAL_FORM', 'DEFAULT_QUIZ_FORM'];

    // Buscar formulários com as referências padrão
    const forms = await this.prisma.form.findMany({
      where: {
        reference: {
          in: defaultReferences,
        },
        active: true,
      },
      include: {
        form_version: {
          where: { active: true },
          orderBy: { version_number: 'desc' },
          take: 1,
        },
      },
    });

    // Mapear para o formato esperado
    return forms
      .filter((form) => form.form_version.length > 0)
      .map((form) => ({
        formId: form.id,
        formTitle: form.title,
        formReference: form.reference,
        version: {
          id: form.form_version[0].id,
          formId: form.form_version[0].form_id,
          versionNumber: form.form_version[0].version_number,
          accessType: form.form_version[0].access_type,
          definition: form.form_version[0].definition,
          active: form.form_version[0].active,
          createdAt: form.form_version[0].created_at,
          updatedAt: form.form_version[0].updated_at,
        },
      }));
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      return null;
    }

    // Verificar se o usuário tem senha definida
    if (!user.password) {
      throw new UnauthorizedException(
        'User password not set. Please contact administrator.',
      );
    }

    // Validar senha usando bcrypt (compatível com hashes migrados do legado)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Re-hashear com cost 11 se o hash atual tiver cost diferente (ex.: migrados com cost menor)
    try {
      const rounds = bcrypt.getRounds(user.password);
      if (rounds !== BCRYPT_ROUNDS) {
        const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { password: newHash },
        });
      }
    } catch {
      // getRounds pode falhar em hashes malformados; ignora e segue com o login
    }

    return user;
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    // Buscar usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    // Verificar se o usuário tem senha definida
    if (!user.password) {
      throw new UnauthorizedException(
        'Senha não definida. Entre em contato com o administrador.',
      );
    }

    // Validar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    // Verificar se a nova senha é diferente da atual
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual',
      );
    }

    // Hash da nova senha (cost 11 para consistência com legado/migração)
    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      BCRYPT_ROUNDS,
    );

    // Atualizar senha e invalidar sessões (refresh tokens)
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      }),
      this.prisma.user_refresh_token.deleteMany({
        where: { user_id: userId },
      }),
    ]);
  }

  async signup(
    signupDto: SignupDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SignupResponseDto> {
    // 1. Validar email único
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException(`Email ${signupDto.email} já está em uso`);
    }

    // 2. Validar contexto existe e é PUBLIC
    const context = await this.prisma.context.findUnique({
      where: { id: signupDto.contextId },
    });

    if (!context) {
      throw new BadRequestException(
        `Contexto com ID ${signupDto.contextId} não encontrado`,
      );
    }

    if (context.access_type !== 'PUBLIC') {
      throw new ForbiddenException(
        'Apenas contextos públicos permitem signup direto',
      );
    }

    // 3. Validar IDs dos documentos legais
    await this.legalDocumentsService.validateDocumentIds(
      signupDto.acceptedLegalDocumentIds,
    );

    // 4. Verificar se o Termo de Uso foi aceito (regra de negócio: apenas Termo de Uso é obrigatório no signup)
    const termsOfUse =
      await this.legalDocumentsService.findByTypeCode('TERMS_OF_USE');
    if (!signupDto.acceptedLegalDocumentIds.includes(termsOfUse.id)) {
      throw new BadRequestException(
        'É obrigatório aceitar o Termo de Uso para criar uma conta',
      );
    }

    // 5. Criar usuário, participation e aceites em transação
    const result = await this.prisma.$transaction(async (tx) => {
      // Hash da senha (cost 11 para consistência com legado/migração)
      const hashedPassword = await bcrypt.hash(
        signupDto.password,
        BCRYPT_ROUNDS,
      );

      // Criar usuário
      const user = await tx.user.create({
        data: {
          name: signupDto.name,
          email: signupDto.email,
          password: hashedPassword,
          active: true,
        },
      });

      // Criar participation
      const participation = await tx.participation.create({
        data: {
          user_id: user.id,
          context_id: signupDto.contextId,
          start_date: new Date(),
          active: true,
        },
      });

      // Atribuir papel "participant" à participação (RBAC)
      const participantRole = await tx.role.findUnique({
        where: { code: 'participant' },
      });
      if (participantRole) {
        await tx.participation_role.create({
          data: {
            participation_id: participation.id,
            role_id: participantRole.id,
          },
        });
      }

      // Criar aceites de documentos legais
      const acceptances = await Promise.all(
        signupDto.acceptedLegalDocumentIds.map((docId) =>
          tx.user_legal_acceptance.create({
            data: {
              user_id: user.id,
              legal_document_id: docId,
              ip_address: ipAddress,
              user_agent: userAgent,
            },
          }),
        ),
      );

      return { user, participation, acceptances };
    });

    this.businessMetrics.recordAuthSignupCompleted();

    // 6. Gerar JWT e refresh token
    const accessToken = this.generateToken(result.user);
    const refreshToken = await this.issueRefreshToken(result.user.id);

    // 7. Retornar resposta
    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        active: result.user.active,
        createdAt: result.user.created_at,
        updatedAt: result.user.updated_at,
      },
      accessToken,
      refreshToken,
      participation: {
        id: result.participation.id,
        contextId: result.participation.context_id,
        startDate: result.participation.start_date.toISOString().split('T')[0],
      },
    };
  }

  generateToken(user: any): string {
    const payload = { email: user.email, sub: user.id };
    return this.jwtService.sign(payload);
  }

  async refreshAccessToken(
    rawRefreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const row = await this.prisma.user_refresh_token.findFirst({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!row || !row.user.active) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    await this.prisma.user_refresh_token.update({
      where: { id: row.id },
      data: { revoked_at: new Date() },
    });

    const newRefreshToken = await this.issueRefreshToken(row.user_id);
    const token = this.generateToken(row.user);

    return { token, refreshToken: newRefreshToken };
  }

  async logoutWithRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    await this.prisma.user_refresh_token.updateMany({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
      },
      data: { revoked_at: new Date() },
    });
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user && user.active && this.mailService.isConfigured()) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.resetTokenExpiryHours);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password_reset_token: token,
          password_reset_expires: expiresAt,
        },
      });

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        this.configService.get<string>('APP_URL') ||
        'http://localhost:5173';
      const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

      await this.mailService.sendMail({
        to: user.email,
        subject: 'Redefinição de senha - Guardiões da Saúde',
        html: `
          <p>Olá, ${user.name}</p>
          <p>Você solicitou a redefinição de senha. Clique no link abaixo para definir uma nova senha (válido por ${this.resetTokenExpiryHours}h):</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Se você não solicitou isso, ignore este email.</p>
        `,
      });
    }

    return {
      message:
        'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.',
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        password_reset_token: token,
        password_reset_expires: { gt: new Date() },
        active: true,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Link inválido ou expirado. Solicite uma nova redefinição de senha.',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          password_reset_token: null,
          password_reset_expires: null,
        },
      }),
      this.prisma.user_refresh_token.deleteMany({
        where: { user_id: user.id },
      }),
    ]);
  }
}
