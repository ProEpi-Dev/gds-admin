import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileStatusResponseDto } from './dto/profile-status-response.dto';
import { AcceptLegalDocumentsDto } from './dto/accept-legal-documents.dto';
import { LegalAcceptanceStatusResponseDto } from './dto/legal-acceptance-status-response.dto';
import { UserRoleResponseDto } from './dto/user-role-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';
import { LegalDocumentsService } from '../legal-documents/legal-documents.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private legalDocumentsService: LegalDocumentsService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Verificar se email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(`Email ${createUserDto.email} já está em uso`);
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Criar usuário
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        active: createUserDto.active ?? true,
      },
    });

    return this.mapToResponseDto(user);
  }

  async findAll(query: UserQueryDto): Promise<ListResponseDto<UserResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Construir filtros
    const where: any = {};

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      // Por padrão, mostrar apenas usuários ativos
      where.active = true;
    }

    if (query.search) {
      // Usar Prisma.sql para busca case insensitive
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Buscar usuários e total
    const [users, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Criar resposta paginada
    const baseUrl = '/v1/users';
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;
    if (query.search) queryParams.search = query.search;

    return {
      data: users.map((user) => this.mapToResponseDto(user)),
      meta: createPaginationMeta({ page, pageSize, totalItems, baseUrl, queryParams }),
      links: createPaginationLinks({ page, pageSize, totalItems, baseUrl, queryParams }),
    };
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    return this.mapToResponseDto(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    // Verificar se usuário existe
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // Verificar se email já está em uso por outro usuário
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailInUse = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailInUse) {
        throw new ConflictException(`Email ${updateUserDto.email} já está em uso`);
      }
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (updateUserDto.name !== undefined) {
      updateData.name = updateUserDto.name;
    }

    if (updateUserDto.email !== undefined) {
      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.password !== undefined) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.active !== undefined) {
      updateData.active = updateUserDto.active;
    }

    // Atualizar usuário
    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponseDto(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    if (user.active) {
      // Usuário ativo: soft delete (apenas desativar)
      await this.prisma.user.update({
        where: { id },
        data: { active: false },
      });
      return;
    }

    // Usuário já inativo: tentar exclusão permanente
    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      const isFkError =
        error instanceof Prisma.PrismaClientKnownRequestError ||
        (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2003');
      if (isFkError) {
        throw new BadRequestException(
          'Não é possível excluir permanentemente este usuário: existem vínculos no sistema que impedem a exclusão (ex.: conteúdos em que é autor). Remova as dependências ou mantenha o usuário inativo.',
        );
      }
      throw error;
    }
  }

  /**
   * Verifica o status do perfil do usuário
   */
  async getProfileStatus(userId: number): Promise<ProfileStatusResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    const missingFields: string[] = [];

    if (!user.gender_id) {
      missingFields.push('genderId');
    }
    if (!user.location_id) {
      missingFields.push('locationId');
    }
    if (!user.external_identifier) {
      missingFields.push('externalIdentifier');
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields,
      profile: {
        genderId: user.gender_id,
        locationId: user.location_id,
        externalIdentifier: user.external_identifier,
      },
    };
  }

  /**
   * Atualiza o perfil do usuário
   */
  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // Validar genderId se fornecido
    if (updateProfileDto.genderId !== undefined) {
      const gender = await this.prisma.gender.findUnique({
        where: { id: updateProfileDto.genderId },
      });

      if (!gender) {
        throw new BadRequestException(
          `Gênero com ID ${updateProfileDto.genderId} não encontrado`,
        );
      }
    }

    // Validar locationId se fornecido
    if (updateProfileDto.locationId !== undefined) {
      const location = await this.prisma.location.findUnique({
        where: { id: updateProfileDto.locationId },
      });

      if (!location) {
        throw new BadRequestException(
          `Localização com ID ${updateProfileDto.locationId} não encontrado`,
        );
      }
    }

    // Atualizar perfil
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        gender_id: updateProfileDto.genderId,
        location_id: updateProfileDto.locationId,
        external_identifier: updateProfileDto.externalIdentifier,
      },
    });

    return this.mapToResponseDto(updatedUser);
  }

  /**
   * Aceita documentos legais
   */
  async acceptLegalDocuments(
    userId: number,
    acceptLegalDocumentsDto: AcceptLegalDocumentsDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // Validar documentos
    await this.legalDocumentsService.validateDocumentIds(
      acceptLegalDocumentsDto.legalDocumentIds,
    );

    // Criar aceites (usando upsert para evitar duplicados)
    await Promise.all(
      acceptLegalDocumentsDto.legalDocumentIds.map((docId) =>
        this.prisma.user_legal_acceptance.upsert({
          where: {
            user_id_legal_document_id: {
              user_id: userId,
              legal_document_id: docId,
            },
          },
          create: {
            user_id: userId,
            legal_document_id: docId,
            ip_address: ipAddress,
            user_agent: userAgent,
          },
          update: {
            accepted_at: new Date(),
            ip_address: ipAddress,
            user_agent: userAgent,
          },
        }),
      ),
    );
  }

  /**
   * Verifica o status de aceite de termos legais
   */
  async getLegalAcceptanceStatus(
    userId: number,
  ): Promise<LegalAcceptanceStatusResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // Buscar documentos ativos
    const activeDocuments = await this.legalDocumentsService.findActive();

    // Buscar aceites do usuário
    const userAcceptances = await this.prisma.user_legal_acceptance.findMany({
      where: { user_id: userId },
      include: {
        legal_document: {
          include: {
            legal_document_type: true,
          },
        },
      },
    });

    // Mapear aceites por ID do documento
    const acceptanceMap = new Map(
      userAcceptances.map((acceptance) => [
        acceptance.legal_document_id,
        acceptance,
      ]),
    );

    // Separar documentos pendentes e aceitos
    const pendingDocuments = [];
    const acceptedDocuments = [];

    for (const doc of activeDocuments) {
      const acceptance = acceptanceMap.get(doc.id);

      if (acceptance) {
        acceptedDocuments.push({
          id: doc.id,
          typeCode: doc.typeCode,
          typeName: doc.typeName,
          version: doc.version,
          title: doc.title,
          acceptedAt: acceptance.accepted_at,
        });
      } else {
        pendingDocuments.push({
          id: doc.id,
          typeCode: doc.typeCode,
          typeName: doc.typeName,
          version: doc.version,
          title: doc.title,
        });
      }
    }

    return {
      needsAcceptance: pendingDocuments.length > 0,
      pendingDocuments,
      acceptedDocuments,
    };
  }

  async getUserRole(userId: number): Promise<UserRoleResponseDto> {
    // Buscar todos os context_managers ativos do usuário
    const contextManagers = await this.prisma.context_manager.findMany({
      where: {
        user_id: userId,
        active: true,
        context: {
          active: true,
        },
      },
      select: {
        context_id: true,
      },
    });

    // Buscar todas as participations ativas do usuário
    const today = new Date();
    const participations = await this.prisma.participation.findMany({
      where: {
        user_id: userId,
        active: true,
        context: {
          active: true,
        },
        start_date: {
          lte: today,
        },
        OR: [
          { end_date: null },
          { end_date: { gte: today } },
        ],
      },
      select: {
        context_id: true,
      },
    });

    const asManager = contextManagers.map((cm) => cm.context_id);
    const asParticipant = participations.map((p) => p.context_id);

    return {
      isManager: asManager.length > 0,
      isParticipant: asParticipant.length > 0,
      contexts: {
        asManager,
        asParticipant,
      },
    };
  }

  private mapToResponseDto(user: any): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      genderId: user.gender_id,
      locationId: user.location_id,
      externalIdentifier: user.external_identifier,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}

