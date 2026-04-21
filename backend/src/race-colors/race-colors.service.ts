import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRaceColorDto } from './dto/create-race-color.dto';
import { UpdateRaceColorDto } from './dto/update-race-color.dto';
import { RaceColorResponseDto } from './dto/race-color-response.dto';

@Injectable()
export class RaceColorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly?: boolean): Promise<RaceColorResponseDto[]> {
    const where =
      activeOnly !== undefined ? { active: activeOnly } : { active: true };

    const raceColors = await this.prisma.race_color.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return raceColors.map((item) => this.mapToResponseDto(item));
  }

  async findOne(id: number): Promise<RaceColorResponseDto> {
    const raceColor = await this.prisma.race_color.findUnique({
      where: { id },
    });

    if (!raceColor) {
      throw new NotFoundException(`Raça/cor com ID ${id} não encontrada`);
    }

    return this.mapToResponseDto(raceColor);
  }

  async create(dto: CreateRaceColorDto): Promise<RaceColorResponseDto> {
    try {
      const raceColor = await this.prisma.race_color.create({
        data: { name: dto.name },
      });

      return this.mapToResponseDto(raceColor);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe uma raça/cor com esse nome');
      }
      throw error;
    }
  }

  async update(
    id: number,
    dto: UpdateRaceColorDto,
  ): Promise<RaceColorResponseDto> {
    try {
      const raceColor = await this.prisma.race_color.update({
        where: { id },
        data: {
          ...dto,
          updated_at: new Date(),
        },
      });

      return this.mapToResponseDto(raceColor);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe uma raça/cor com esse nome');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Raça/cor com ID ${id} não encontrada`);
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const usersCount = await this.prisma.user.count({
      where: { race_color_id: id },
    });

    if (usersCount > 0) {
      throw new BadRequestException(
        `Não é possível deletar a raça/cor pois existem ${usersCount} usuário(s) associado(s).`,
      );
    }

    try {
      await this.prisma.race_color.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Raça/cor com ID ${id} não encontrada`);
      }
      throw error;
    }
  }

  private mapToResponseDto(item: any): RaceColorResponseDto {
    return {
      id: item.id,
      name: item.name,
      active: item.active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }
}
