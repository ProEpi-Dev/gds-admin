import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createLocationDto: CreateLocationDto,
  ): Promise<LocationResponseDto> {
    // Validar parent_id se fornecido
    if (createLocationDto.parentId) {
      const parent = await this.prisma.location.findUnique({
        where: { id: createLocationDto.parentId },
      });

      if (!parent) {
        throw new BadRequestException(
          `Localização pai com ID ${createLocationDto.parentId} não encontrada`,
        );
      }
    }

    // Preparar dados
    const data: any = {
      name: createLocationDto.name,
      active: createLocationDto.active ?? true,
    };

    if (createLocationDto.parentId !== undefined) {
      data.parent_id = createLocationDto.parentId;
    }

    if (createLocationDto.latitude !== undefined) {
      data.latitude = createLocationDto.latitude;
    }

    if (createLocationDto.longitude !== undefined) {
      data.longitude = createLocationDto.longitude;
    }

    if (createLocationDto.polygons !== undefined) {
      data.polygons = createLocationDto.polygons;
    }

    // Criar localização
    const location = await this.prisma.location.create({ data });

    return this.mapToResponseDto(location);
  }

  async findAll(
    query: LocationQueryDto,
  ): Promise<ListResponseDto<LocationResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Construir filtros
    const where: any = {};

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      // Por padrão, mostrar apenas localizações ativas
      where.active = true;
    }

    if (query.parentId !== undefined) {
      where.parent_id = query.parentId;
    }

    // Buscar localizações e total
    const [locations, totalItems] = await Promise.all([
      this.prisma.location.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.location.count({ where }),
    ]);

    // Criar resposta paginada
    const baseUrl = '/v1/locations';
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;
    if (query.parentId !== undefined) queryParams.parentId = query.parentId;

    return {
      data: locations.map((location) => this.mapToResponseDto(location)),
      meta: createPaginationMeta({
        page,
        pageSize,
        totalItems,
        baseUrl,
        queryParams,
      }),
      links: createPaginationLinks({
        page,
        pageSize,
        totalItems,
        baseUrl,
        queryParams,
      }),
    };
  }

  async findOne(id: number): Promise<LocationResponseDto> {
    const location = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException(`Localização com ID ${id} não encontrada`);
    }

    return this.mapToResponseDto(location);
  }

  async update(
    id: number,
    updateLocationDto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    // Verificar se localização existe
    const existingLocation = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      throw new NotFoundException(`Localização com ID ${id} não encontrada`);
    }

    // Validar parent_id se fornecido
    if (updateLocationDto.parentId !== undefined) {
      if (updateLocationDto.parentId === id) {
        throw new BadRequestException(
          'Uma localização não pode ser pai de si mesma',
        );
      }

      if (updateLocationDto.parentId !== null) {
        const parent = await this.prisma.location.findUnique({
          where: { id: updateLocationDto.parentId },
        });

        if (!parent) {
          throw new BadRequestException(
            `Localização pai com ID ${updateLocationDto.parentId} não encontrada`,
          );
        }
      }
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (updateLocationDto.name !== undefined) {
      updateData.name = updateLocationDto.name;
    }

    if (updateLocationDto.parentId !== undefined) {
      updateData.parent_id = updateLocationDto.parentId;
    }

    if (updateLocationDto.latitude !== undefined) {
      updateData.latitude = updateLocationDto.latitude;
    }

    if (updateLocationDto.longitude !== undefined) {
      updateData.longitude = updateLocationDto.longitude;
    }

    if (updateLocationDto.polygons !== undefined) {
      updateData.polygons = updateLocationDto.polygons;
    }

    if (updateLocationDto.active !== undefined) {
      updateData.active = updateLocationDto.active;
    }

    // Atualizar localização
    const location = await this.prisma.location.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponseDto(location);
  }

  async remove(id: number): Promise<void> {
    // Verificar se localização existe
    const location = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException(`Localização com ID ${id} não encontrada`);
    }

    // Verificar se há localizações filhas
    const children = await this.prisma.location.count({
      where: { parent_id: id },
    });

    if (children > 0) {
      throw new BadRequestException(
        `Não é possível deletar localização com ${children} localização(ões) filha(s)`,
      );
    }

    // Soft delete - apenas desativar
    await this.prisma.location.update({
      where: { id },
      data: { active: false },
    });
  }

  private mapToResponseDto(location: any): LocationResponseDto {
    return {
      id: location.id,
      parentId: location.parent_id,
      name: location.name,
      latitude: location.latitude ? Number(location.latitude) : null,
      longitude: location.longitude ? Number(location.longitude) : null,
      polygons: location.polygons,
      active: location.active,
      createdAt: location.created_at,
      updatedAt: location.updated_at,
    };
  }
}
