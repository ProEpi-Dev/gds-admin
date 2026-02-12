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
    try {
      return await this.prisma.content_type.create({
        data,
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
    try {
      return await this.prisma.content_type.update({
        where: { id },
        data: {
          ...data,
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
    return this.prisma.content_type.update({
      where: { id },
      data: {
        active: false,
        updated_at: new Date(),
      },
    });
  }
}
