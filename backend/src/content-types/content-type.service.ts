import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateContentTypeDto, UpdateContentTypeDto } from './content-type.dto';

@Injectable()
export class ContentTypeService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.content_type.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllForAdmin() {
    return this.prisma.content_type.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(data: CreateContentTypeDto) {
    const normalizedName = data.name.trim();
    if (!normalizedName) {
      throw new BadRequestException('Nome do tipo de conteúdo é obrigatório');
    }

    const existingByName = await this.prisma.content_type.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (existingByName) {
      if (!existingByName.active) {
        return this.prisma.content_type.update({
          where: { id: existingByName.id },
          data: {
            name: normalizedName,
            color: data.color,
            active: true,
            updated_at: new Date(),
          },
        });
      }

      throw new BadRequestException(
        'Já existe um tipo de conteúdo com esse nome',
      );
    }

    try {
      return await this.prisma.content_type.create({
        data: {
          ...data,
          name: normalizedName,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Já existe um tipo de conteúdo com esse nome',
        );
      }
      throw error;
    }
  }

  async findOne(id: number) {
    return this.prisma.content_type.findUnique({ where: { id } });
  }

  async update(id: number, data: UpdateContentTypeDto) {
    const normalizedName = data.name?.trim();
    if (data.name !== undefined && !normalizedName) {
      throw new BadRequestException('Nome do tipo de conteúdo é obrigatório');
    }

    if (normalizedName) {
      const existingByName = await this.prisma.content_type.findFirst({
        where: {
          id: { not: id },
          name: {
            equals: normalizedName,
            mode: 'insensitive',
          },
        },
      });

      if (existingByName) {
        throw new BadRequestException(
          'Já existe um tipo de conteúdo com esse nome',
        );
      }
    }

    try {
      return await this.prisma.content_type.update({
        where: { id },
        data: {
          ...data,
          ...(normalizedName !== undefined ? { name: normalizedName } : {}),
          updated_at: new Date(),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Já existe um tipo de conteúdo com esse nome',
        );
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.content_type.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Não é possível deletar este tipo de conteúdo pois existem conteúdos associados',
        );
      }
      throw error;
    }
  }

  async softDelete(id: number) {
    const [, updatedType] = await this.prisma.$transaction([
      this.prisma.content.updateMany({
        where: { type_id: id },
        data: { type_id: null },
      }),
      this.prisma.content_type.update({
        where: { id },
        data: {
          active: false,
          updated_at: new Date(),
        },
      }),
    ]);

    return updatedType;
  }
}
