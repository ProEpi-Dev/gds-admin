import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenderResponseDto } from './dto/gender-response.dto';
import { CreateGenderDto } from './dto/create-gender.dto';
import { UpdateGenderDto } from './dto/update-gender.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class GendersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lista todos os gêneros
   * @param activeOnly - Se true, retorna apenas ativos. Se false, retorna apenas inativos. Se undefined, retorna apenas ativos (padrão).
   */
  async findAll(activeOnly?: boolean): Promise<GenderResponseDto[]> {
    // Por padrão, retornar apenas ativos quando não especificado
    const where =
      activeOnly !== undefined ? { active: activeOnly } : { active: true };
    const genders = await this.prisma.gender.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return genders.map((gender) => this.mapToResponseDto(gender));
  }

  /**
   * Busca um gênero por ID
   */
  async findOne(id: number): Promise<GenderResponseDto> {
    const gender = await this.prisma.gender.findUnique({
      where: { id },
    });

    if (!gender) {
      throw new NotFoundException(`Gênero com ID ${id} não encontrado`);
    }

    return this.mapToResponseDto(gender);
  }

  /**
   * Cria um novo gênero
   */
  async create(dto: CreateGenderDto): Promise<GenderResponseDto> {
    try {
      const gender = await this.prisma.gender.create({
        data: {
          name: dto.name,
        },
      });

      return this.mapToResponseDto(gender);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe um gênero com esse nome');
      }
      throw error;
    }
  }

  /**
   * Atualiza um gênero existente
   */
  async update(id: number, dto: UpdateGenderDto): Promise<GenderResponseDto> {
    try {
      const gender = await this.prisma.gender.update({
        where: { id },
        data: {
          ...dto,
          updated_at: new Date(),
        },
      });

      return this.mapToResponseDto(gender);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe um gênero com esse nome');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Gênero com ID ${id} não encontrado`);
      }
      throw error;
    }
  }

  /**
   * Remove um gênero (soft delete - desativa)
   */
  async remove(id: number): Promise<void> {
    // Verificar se há usuários usando este gênero
    const usersCount = await this.prisma.user.count({
      where: { gender_id: id },
    });

    if (usersCount > 0) {
      throw new BadRequestException(
        `Não é possível deletar o gênero pois existem ${usersCount} usuário(s) associado(s) a ele. Desative-o ao invés de deletar.`,
      );
    }

    try {
      await this.prisma.gender.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Gênero com ID ${id} não encontrado`);
      }
      throw error;
    }
  }

  private mapToResponseDto(gender: any): GenderResponseDto {
    return {
      id: gender.id,
      name: gender.name,
      active: gender.active,
      createdAt: gender.created_at,
      updatedAt: gender.updated_at,
    };
  }
}
