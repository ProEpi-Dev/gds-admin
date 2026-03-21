import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleResponseDto } from './dto/role-response.dto';
import { PermissionResponseDto } from './dto/permission-response.dto';

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

  async findAllPermissions(): Promise<PermissionResponseDto[]> {
    const rows = await this.prisma.permission.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    });
    return rows.map((p) => this.mapPermissionToDto(p));
  }

  async getRolePermissions(roleId: number): Promise<PermissionResponseDto[]> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Papel com ID ${roleId} não encontrado`);
    }
    const links = await this.prisma.role_permission.findMany({
      where: { role_id: roleId },
      include: { permission: true },
    });
    return links
      .map((l) => l.permission)
      .filter((p) => p.active)
      .map((p) => this.mapPermissionToDto(p))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async setRolePermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<PermissionResponseDto[]> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Papel com ID ${roleId} não encontrado`);
    }

    const uniqueIds = [...new Set(permissionIds)];
    if (uniqueIds.length > 0) {
      const permissions = await this.prisma.permission.findMany({
        where: { id: { in: uniqueIds }, active: true },
      });
      if (permissions.length !== uniqueIds.length) {
        throw new BadRequestException(
          'Uma ou mais permissões são inválidas ou estão inativas.',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.role_permission.deleteMany({ where: { role_id: roleId } });
      if (uniqueIds.length > 0) {
        await tx.role_permission.createMany({
          data: uniqueIds.map((permission_id) => ({
            role_id: roleId,
            permission_id,
          })),
        });
      }
    });

    return this.getRolePermissions(roleId);
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

  private mapPermissionToDto(p: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    active: boolean;
  }): PermissionResponseDto {
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description ?? null,
      active: p.active,
    };
  }
}
