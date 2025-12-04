import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(data: { name: string; color?: string; description?: string }) {
    try {
      return await this.prisma.tag.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe uma tag com esse nome');
      }
      throw error;
    }
  }

  findOne(id: number) {
    return this.prisma.tag.findUnique({ where: { id } });
  }

  async update(
    id: number,
    data: {
      name?: string;
      color?: string;
      description?: string;
      active?: boolean;
    },
  ) {
    try {
      return await this.prisma.tag.update({
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
        throw new BadRequestException('Já existe uma tag com esse nome');
      }
      throw error;
    }
  }

  remove(id: number) {
    return this.prisma.tag.delete({ where: { id } });
  }
}
