import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";
import type { Role } from "../../types/role.types";
import type { Permission } from "../../types/permission.types";

export const rolesService = {
  async findAll(): Promise<Role[]> {
    const response = await apiClient.get(API_ENDPOINTS.ROLES.LIST);
    return response.data;
  },

  async findAllPermissions(): Promise<Permission[]> {
    const response = await apiClient.get(API_ENDPOINTS.PERMISSIONS.LIST);
    return response.data;
  },

  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const response = await apiClient.get(
      API_ENDPOINTS.ROLES.PERMISSIONS(roleId),
    );
    return response.data;
  },

  async setRolePermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<Permission[]> {
    const response = await apiClient.put(
      API_ENDPOINTS.ROLES.PERMISSIONS(roleId),
      { permissionIds },
    );
    return response.data;
  },

  async findParticipationRoles(participationId: number): Promise<Role[]> {
    const response = await apiClient.get(
      API_ENDPOINTS.PARTICIPATIONS.ROLES(participationId)
    );
    return response.data;
  },

  async addParticipationRole(
    participationId: number,
    roleId: number
  ): Promise<Role[]> {
    const response = await apiClient.post(
      API_ENDPOINTS.PARTICIPATIONS.ROLES(participationId),
      { roleId }
    );
    return response.data;
  },

  async removeParticipationRole(
    participationId: number,
    roleId: number
  ): Promise<Role[]> {
    const response = await apiClient.delete(
      API_ENDPOINTS.PARTICIPATIONS.REMOVE_ROLE(participationId, roleId)
    );
    return response.data;
  },
};
