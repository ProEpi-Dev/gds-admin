import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenderResponseDto } from './dto/gender-response.dto';

@Injectable()
export class GendersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lista todos os gêneros ativos
   */
  async findAll(): Promise<GenderResponseDto[]> {
    const genders = await this.prisma.gender.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return genders.map((gender) => this.mapToResponseDto(gender));
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
