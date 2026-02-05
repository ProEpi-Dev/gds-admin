import type { FormVersion } from './form-version.types';

export interface LoginDto {
  email: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ParticipationLogin {
  id: number;
  userId: number;
  context: {
    id: number;
    name: string;
  };
  startDate: string;
  endDate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DefaultForm {
  formId: number;
  formTitle: string;
  formReference: string | null;
  version: FormVersion | null;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  };
  participation: ParticipationLogin | null;
  defaultForms?: DefaultForm[];
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  genderId?: number | null;
  locationId?: number | null;
  externalIdentifier?: string | null;
  participation: ParticipationLogin | null;
}

export interface SignupDto {
  name: string;
  email: string;
  password: string;
  contextId: number;
  acceptedLegalDocumentIds: number[];
}

export interface SignupResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  };
  participation: ParticipationLogin;
}
