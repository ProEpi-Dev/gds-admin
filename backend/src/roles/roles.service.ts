import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleResponseDto } from './dto/role-response.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.role.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
    });
    return roles.map((r) => this.mapToDto(r));
  }

  private mapToDto(role: any): RoleResponseDto {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description ?? null,
      scope: role.scope ?? null,
      active: role.active,
    };
  }
}
