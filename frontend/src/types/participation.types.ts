import type { PaginationQuery } from "./api.types";

export interface Participation {
  id: number;
  userId: number;
  contextId: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  /** Nome do usuário (quando includeUser=true na listagem) */
  userName?: string;
  /** Email do usuário (quando includeUser=true na listagem) */
  userEmail?: string;
}

export interface CreateParticipationDto {
  /** ID de usuário existente. Se não informado, os campos newUser* são obrigatórios. */
  userId?: number;
  /** Nome do novo usuário (criação inline) */
  newUserName?: string;
  /** E-mail do novo usuário (criação inline) */
  newUserEmail?: string;
  /** Senha do novo usuário (criação inline) */
  newUserPassword?: string;
  /** Matrícula do novo usuário (criação inline) */
  newUserEnrollment?: string;
  /** Organização nível 1 do novo usuário (criação inline) */
  newUserOrganizationLevel1?: string;
  /** Organização nível 2 do novo usuário (criação inline) */
  newUserOrganizationLevel2?: string;
  /** Organização nível 3 do novo usuário (criação inline) */
  newUserOrganizationLevel3?: string;
  contextId: number;
  startDate: string;
  endDate?: string;
  active?: boolean;
  /** ID do papel a atribuir. Se omitido, usa "participant" como padrão. */
  roleId?: number;
}

export interface UpdateParticipationDto {
  userId?: number;
  contextId?: number;
  startDate?: string;
  endDate?: string | null;
  active?: boolean;
}

export interface ParticipationQuery extends PaginationQuery {
  active?: boolean;
  userId?: number;
  contextId?: number;
  /** Incluir nome e email do usuário na resposta */
  includeUser?: boolean;
  /** Buscar por nome ou email do usuário (server-side) */
  search?: string;
}
