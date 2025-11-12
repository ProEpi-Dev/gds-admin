import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetupDto } from './dto/setup.dto';
import { SetupResponseDto } from './dto/setup-response.dto';
import { context_access_type } from '../../generated/prisma/enums';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SetupService {
  constructor(private prisma: PrismaService) {}

  async setup(setupDto: SetupDto): Promise<SetupResponseDto> {
    // Verificar se já existe um contexto padrão
    const existingContext = await this.prisma.context.findFirst({
      where: {
        name: setupDto.contextName || 'Contexto Principal',
        active: true,
      },
    });

    if (existingContext) {
      throw new BadRequestException('Sistema já foi inicializado. Já existe um contexto padrão.');
    }

    // Verificar se já existe um usuário com o email fornecido
    const existingUser = await this.prisma.user.findUnique({
      where: { email: setupDto.managerEmail },
    });

    if (existingUser) {
      throw new BadRequestException(
        `Já existe um usuário com o email ${setupDto.managerEmail}`,
      );
    }

    // Criar contexto padrão e manager em uma transação
    const result = await this.prisma.$transaction(async (tx) => {
      // Hash da senha do manager
      const hashedPassword = await bcrypt.hash(setupDto.managerPassword, 10);

      // Criar usuário manager padrão
      const manager = await tx.user.create({
        data: {
          name: setupDto.managerName,
          email: setupDto.managerEmail,
          password: hashedPassword,
          active: true,
        },
      });

      // Criar contexto padrão
      const context = await tx.context.create({
        data: {
          name: setupDto.contextName || 'Contexto Principal',
          description: setupDto.contextDescription || 'Contexto padrão do sistema',
          access_type: context_access_type.PUBLIC,
          active: true,
        },
      });

      // Criar relação context_manager
      const contextManager = await tx.context_manager.create({
        data: {
          user_id: manager.id,
          context_id: context.id,
          active: true,
        },
      });

      return {
        manager,
        context,
        contextManager,
      };
    });

    return {
      message: 'Sistema inicializado com sucesso',
      context: {
        id: result.context.id,
        name: result.context.name,
        description: result.context.description,
        accessType: result.context.access_type,
        active: result.context.active,
      },
      manager: {
        id: result.manager.id,
        name: result.manager.name,
        email: result.manager.email,
        active: result.manager.active,
        createdAt: result.manager.created_at,
        updatedAt: result.manager.updated_at,
      },
      contextManager: {
        id: result.contextManager.id,
        userId: result.contextManager.user_id,
        contextId: result.contextManager.context_id,
        active: result.contextManager.active,
      },
    };
  }
}

